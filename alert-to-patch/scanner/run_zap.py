import json
import os
import sys
import time
from collections import Counter
from pathlib import Path

import httpx

ZAP = "http://127.0.0.1:8090"
CIBLE = "http://localhost:3000"
CLE = os.environ.get("ZAP_API_KEY")
if not CLE:
    sys.exit("Variable ZAP_API_KEY absente : fais l'export dans cette fenetre.")

# Adresses connues de l'application de test (ZAP ne voit pas
# toutes les adresses appelees par le JavaScript de la page)
DEPART = ["/", "/robots.txt", "/ftp", "/rest/products/search?q=apple",
          "/api/Products", "/api/Challenges", "/rest/languages",
          "/rest/admin/application-version"]


def api(chemin, **params):
    # Envoie une commande a ZAP et renvoie sa reponse JSON
    r = httpx.get(f"{ZAP}/JSON/{chemin}/", params=params,
                  headers={"X-ZAP-API-Key": CLE}, timeout=120)
    r.raise_for_status()
    return r.json()


def attendre(chemin, **params):
    # Attend qu'un scan atteigne 100 %
    while True:
        progression = int(api(chemin, **params)["status"])
        print(f"  progression : {progression}%   ", end="\r")
        if progression >= 100:
            print()
            return
        time.sleep(3)


# 1) ZAP est-il pret ?
for _ in range(60):
    try:
        api("core/view/version")
        break
    except Exception:
        time.sleep(3)
else:
    sys.exit("ZAP ne repond pas sur le port 8090.")

# 2) On presente a ZAP les adresses de depart
print("1/4 Adresses de depart...")
for chemin in DEPART:
    api("core/action/accessUrl", url=CIBLE + chemin, followRedirects="true")

# 3) Exploration du site (spider)
print("2/4 Exploration (spider)...")
scan = api("spider/action/scan", url=CIBLE, recurse="true")["scan"]
attendre("spider/view/status", scanId=scan)

# 4) Analyse passive : ZAP examine tout ce qu'il a vu
print("3/4 Analyse passive...")
while int(api("pscan/view/recordsToScan")["recordsToScan"]) > 0:
    time.sleep(2)

# 5) Scan actif (optionnel) : ZAP teste des attaques
if "--actif" in sys.argv:
    print("Scan actif (long : 15 a 60 min)...")
    scan = api("ascan/action/scan", url=CIBLE, recurse="true")["scan"]
    attendre("ascan/view/status", scanId=scan)

# 6) Export des alertes en JSON
print("4/4 Export des alertes...")
alertes = api("alert/view/alerts", baseurl=CIBLE, start=0, count=5000)["alerts"]
sortie = Path("output/alertes.json")
sortie.parent.mkdir(exist_ok=True)
sortie.write_text(json.dumps(alertes, indent=2, ensure_ascii=False), encoding="utf-8")

types = {a["pluginId"] for a in alertes}
print(f"Termine : {len(alertes)} alertes ({len(types)} types) -> {sortie}")
print("Par gravite :", dict(Counter(a["risk"] for a in alertes)))
