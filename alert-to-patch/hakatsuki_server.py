#!/usr/bin/env python3
"""HAKATSUKI local dashboard. Standard library only; binds to 127.0.0.1."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json, os, subprocess, sys, threading, time

ROOT = Path(__file__).resolve().parent
# Supporte une installation directe dans la racine du projet ou dans un sous-dossier dashboard/.
PROJECT = ROOT if (ROOT / "scanner").is_dir() and (ROOT / "rag").is_dir() else ROOT.parent
WEB = ROOT / "frontend"
OUTPUT = PROJECT / "output"
ALERTS = OUTPUT / "alertes.json"
LOG = OUTPUT / "hakatsuki_scan.log"
HOST, PORT = "127.0.0.1", 8765
MODEL = os.environ.get("HAKATSUKI_OLLAMA_MODEL", "llama3.2:3b")
scan_lock = threading.Lock()
scan_state = {"running": False, "started_at": None, "finished_at": None, "exit_code": None, "message": "Aucun scan lancé depuis HAKATSUKI."}


def http_json(url, payload=None, timeout=2):
    data = None if payload is None else json.dumps(payload).encode()
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=timeout) as r:
        raw = r.read(1_500_000)
        return json.loads(raw.decode("utf-8", "replace")) if raw else {}


def probe(url):
    try:
        with urlopen(url, timeout=1.2) as r:
            return {"online": True, "detail": f"HTTP {r.status}"}
    except HTTPError as e:
        return {"online": True, "detail": f"HTTP {e.code}"}
    except Exception as e:
        return {"online": False, "detail": type(e).__name__}


def load_alerts():
    if not ALERTS.exists():
        return [], "output/alertes.json introuvable. Lance un scan avant de consulter les alertes."
    try:
        data = json.loads(ALERTS.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            return [], "Le fichier alertes.json ne contient pas une liste JSON."
        return data, None
    except Exception as e:
        return [], f"Impossible de lire alertes.json : {e}"


def service_status():
    juice = probe("http://127.0.0.1:3000")
    zap = probe("http://127.0.0.1:8090/JSON/core/view/version/")
    ollama = probe("http://127.0.0.1:11434/api/tags")
    ollama["model"] = MODEL
    if ollama["online"]:
        try:
            tags = http_json("http://127.0.0.1:11434/api/tags", timeout=2).get("models", [])
            names = [m.get("name", "") for m in tags]
            ollama["model_available"] = any(n == MODEL or n.startswith(MODEL + ":") for n in names)
        except Exception:
            ollama["model_available"] = False
    else:
        ollama["model_available"] = False
    return {"juice_shop": juice, "zap": zap, "ollama": ollama}


def run_scan():
    with scan_lock:
        if scan_state["running"]:
            return
        scan_state.update(running=True, started_at=time.strftime("%Y-%m-%d %H:%M:%S"), finished_at=None, exit_code=None, message="Scan en cours…")
    OUTPUT.mkdir(exist_ok=True)
    try:
        with LOG.open("w", encoding="utf-8") as out:
            env = os.environ.copy()
            key_file = PROJECT / ".zap_key"
            if not env.get("ZAP_API_KEY") and key_file.exists():
                env["ZAP_API_KEY"] = key_file.read_text(encoding="utf-8").strip()
            proc = subprocess.Popen([sys.executable, "scanner/run_zap.py"], cwd=PROJECT, env=env, stdout=out, stderr=subprocess.STDOUT)
            code = proc.wait()
        scan_state.update(running=False, finished_at=time.strftime("%Y-%m-%d %H:%M:%S"), exit_code=code,
                          message="Scan terminé." if code == 0 else f"Le scanner s'est terminé avec le code {code}. Consulte output/hakatsuki_scan.log.")
    except Exception as e:
        scan_state.update(running=False, finished_at=time.strftime("%Y-%m-%d %H:%M:%S"), exit_code=-1, message=f"Échec du lancement : {e}")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def log_message(self, fmt, *args):
        # Keep the console quiet; API errors are returned to the browser.
        pass

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/status":
            alerts, err = load_alerts()
            counts = {k: 0 for k in ["Critical", "High", "Medium", "Low", "Informational", "Unknown"]}
            for a in alerts:
                risk = str(a.get("risk", "Unknown")).title()
                counts[risk if risk in counts else "Unknown"] += 1
            self.send_json(200, {"services": service_status(), "counts": counts, "total": len(alerts),
                                 "alerts_error": err, "scan": scan_state,
                                 "alerts_updated": (time.strftime("%d/%m/%Y a %H:%M", time.localtime(ALERTS.stat().st_mtime)) if ALERTS.exists() else None),
                                 "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")})
            return
        if path == "/api/alerts":
            alerts, err = load_alerts()
            self.send_json(200, {"alerts": alerts, "error": err})
            return
        if path == "/api/scan-status":
            self.send_json(200, scan_state)
            return
        if path == "/api/rag/status":
            try:
                import chromadb
                db = chromadb.PersistentClient(path=str(PROJECT / "rag" / "chroma_db"))
                collection = db.get_collection("owasp_knowledge")
                self.send_json(200, {"available": True, "count": collection.count(), "collection": "owasp_knowledge"})
            except Exception as e:
                self.send_json(200, {"available": False, "count": 0, "error": str(e)})
            return
        return super().do_GET()

    def do_POST(self):
        origin = self.headers.get("Origin")
        if self.headers.get("Host") not in (f"{HOST}:{PORT}", f"localhost:{PORT}") or (origin and origin not in (f"http://{HOST}:{PORT}", f"http://localhost:{PORT}")):
            self.send_json(403, {"error": "Origine refusee."})
            return
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", "0"))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            body = {}
        if path == "/api/scan":
            s = service_status()
            if not s["juice_shop"]["online"] or not s["zap"]["online"]:
                self.send_json(409, {"error": "Juice Shop et ZAP doivent être démarrés localement avant le scan.", "services": s})
                return
            if scan_state["running"]:
                self.send_json(409, {"error": "Un scan est déjà en cours."})
                return
            threading.Thread(target=run_scan, daemon=True).start()
            self.send_json(202, {"message": "Scan local lancé.", "scope": "http://localhost:3000"})
            return
        if path == "/api/rag/query":
            question = str(body.get("question", "")).strip()
            if not question:
                self.send_json(400, {"error": "Saisis une question."})
                return
            try:
                import chromadb
                db = chromadb.PersistentClient(path=str(PROJECT / "rag" / "chroma_db"))
                collection = db.get_collection("owasp_knowledge")
                if collection.count() == 0:
                    self.send_json(503, {"error": "La base OWASP est vide. Lance d'abord python rag/ingest.py."})
                    return
                sys.path.insert(0, str(PROJECT / "rag"))
                from embed import embed
                result = collection.query(query_embeddings=embed([question]), n_results=3)
                docs = result.get("documents", [[]])[0]
                metas = result.get("metadatas", [[]])[0]
                items = [{"source": (meta or {}).get("source", "Source inconnue"), "text": doc}
                         for doc, meta in zip(docs, metas)]
                self.send_json(200, {"question": question, "results": items, "count": len(items)})
            except Exception as e:
                self.send_json(503, {"error": f"Recherche RAG indisponible : {e}"})
            return
        if path == "/api/ai/analyze":
            alert = body.get("alert") or {}
            prompt = ("Tu es un assistant de défense applicative. Analyse uniquement l'alerte de sécurité ci-dessous. "
                      "Explique le risque, l'impact probable et des mesures de correction défensives et vérifiables. "
                      "N'invente pas de preuve ni de détail absent. Réponds en français, de façon concise.\n\n" +
                      json.dumps({k: alert.get(k) for k in ["alert", "risk", "description", "solution", "reference", "cweid", "url", "param"]}, ensure_ascii=False))
            try:
                result = http_json("http://127.0.0.1:11434/api/generate", {"model": MODEL, "prompt": prompt, "stream": False,
                                    "options": {"num_predict": 220, "temperature": 0.2}}, timeout=180)
                self.send_json(200, {"response": result.get("response", ""), "model": MODEL})
            except Exception as e:
                self.send_json(503, {"error": f"Ollama indisponible ou génération échouée : {e}"})
            return
        self.send_json(404, {"error": "Route inconnue"})


def main():
    if not WEB.exists():
        raise SystemExit("Dossier frontend introuvable.")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print(" HAKATSUKI | Security Intelligence Dashboard")
    print("=" * 56)
    print(f"Projet : {PROJECT}")
    print(f"URL    : http://{HOST}:{PORT}")
    print("Mode   : local uniquement (127.0.0.1)")
    print("CPU    : aucune génération IA automatique; scan à la demande")
    print("Arrêt  : Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt de HAKATSUKI.")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
