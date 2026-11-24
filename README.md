# HAKATSKI
# Alert → Patch (HAKATSUKI)

Assistant de cybersécurité **100 % local et gratuit** : il analyse les alertes d'un scanner de vulnérabilités et aide à comprendre **comment les corriger**, en s'appuyant sur les guides officiels OWASP (technique RAG).

> ⚠️ **Usage éthique uniquement.** Scanne seulement des applications dont tu es propriétaire ou que tu es autorisé à tester. Les exemples utilisent [OWASP Juice Shop](https://github.com/juice-shop/juice-shop), une cible volontairement vulnérable, en local.

## Le problème

Un scanner produit des dizaines d'alertes techniques, souvent répétées, sans explication de correction. Alert → Patch regroupe les alertes par type, retrouve le guide OWASP correspondant et prépare des recommandations sourcées.

## Fonctionnalités et état d'avancement

| Brique | État |
|---|---|
| Base de connaissances RAG (guides OWASP dans ChromaDB, embeddings via Ollama) | ✅ Fonctionnelle |
| Scan de la cible avec OWASP ZAP (mode daemon) et export `alertes.json` | ✅ Fonctionnel (scan passif ; scan actif en option) |
| Dashboard web HAKATSUKI (alertes, services, dernier scan, recherche OWASP) | ✅ Fonctionnel |
| Agent IA : explication et correctif par type d'alerte (RAG + LLM local) | ✅ Fonctionnel |
| Rapport HTML/PDF et export SARIF | ✅ Fonctionnel |

Les correctifs proposés par une IA **doivent toujours être vérifiés par une personne**.

## Architecture

```
Cible (Juice Shop) → ZAP → alertes.json
                                ↓
        Agent : regroupement → recherche RAG (ChromaDB) → LLM local (Ollama)
                                ↓
                 Dashboard · Rapport · SARIF
```

## Technologies

Python 3.12 · ChromaDB · Ollama (`all-minilm` pour les embeddings, `llama3.2:3b` pour la rédaction) · OWASP ZAP 2.17 · OWASP Juice Shop · HTML/CSS/JavaScript · Bash.

## Prérequis

- Windows (Git Bash) ou Linux/macOS, **16 Go de RAM minimum**
- Python 3.12, Node.js (version indiquée par l'archive Juice Shop), Java 17 ou plus, OWASP ZAP, Ollama
- Aucune carte graphique n'est nécessaire : le modèle tourne sur processeur

## Installation

```bash
git clone https://github.com/hamzus17/HAKATSKI.git alert-to-patch && cd alert-to-patch
python -m venv .venv
source .venv/Scripts/activate      # Linux/macOS : source .venv/bin/activate
pip install chromadb httpx

# Guides OWASP (base de connaissances)
git clone --depth 1 https://github.com/OWASP/CheatSheetSeries.git data/cheatsheets

# Modèles Ollama
ollama pull all-minilm
ollama pull llama3.2:3b

# Construire la base RAG
python rag/ingest.py
```

Cible de test : télécharge l'archive Juice Shop pour ton système depuis ses *releases*, extrais-la dans `targets/juice-shop/`.

**Profil IA** (RAG, modèle, dashboard)

```bash
bash scripts/w4_ollama.sh      # serveur Ollama (mode CPU)
bash scripts/check.sh          # vérification de l'environnement
bash start_hakatsuki.sh        # dashboard : http://127.0.0.1:8765
```

**Profil scan** (génère `output/alertes.json`)

```bash
bash scripts/w1_juice_shop.sh  # fenêtre 1 : la cible
bash scripts/w2_zap.sh         # fenêtre 2 : ZAP (la clé d'API est créée dans .zap_key)
bash scripts/w3_scan.sh        # fenêtre 3 : scan ; option --actif (long)
```

> Sur certains PC, la carte graphique ancienne fait planter Ollama. Le script `w4_ollama.sh` désactive Vulkan (`OLLAMA_VULKAN=0`).

## Structure du dépôt

```
rag/        embed.py · ingest.py · search.py · search_demo.py
scanner/    run_zap.py · resume_alertes.py
scripts/    fenêtres de lancement et vérification
frontend/   dashboard (index.html, style.css, theme_v3.css, app.js, assets/)
hakatsuki_server.py   serveur local du dashboard
samples/    exemple d'alertes pour tester sans ZAP
```

Dossiers ignorés par Git : `.venv/`, `data/`, `targets/`, `output/`, `rag/chroma_db/`, `.zap_key`.

## Sécurité du projet

- Le serveur du dashboard écoute uniquement sur `127.0.0.1` et refuse les requêtes venant d'un autre site.
- ZAP est lancé en local avec une clé d'API qui n'est jamais enregistrée dans le dépôt.
- Juice Shop est vulnérable par conception : ne l'expose jamais sur Internet.

## Limites connues

- Un modèle de 3 milliards de paramètres sur processeur est lent (plusieurs dizaines de secondes par réponse) et peut se tromper.
- Le scan passif ne détecte pas les failles critiques (injection SQL, XSS) : utilise le scan actif.
- L'assistant du dashboard retrouve des passages OWASP ; la rédaction complète d'un correctif par le LLM relève de l'agent en cours de développement.

## Feuille de route

1. Agent : regroupement des alertes, recherche RAG, explication et correctif avec source citée
2. Rapport HTML/PDF et export SARIF
3. GitHub Action
4. Pages Monitoring, Rapports et Paramètres du dashboard

## Licences et crédits

- Code du projet : MIT (ajoute un fichier `LICENSE`)
- Guides OWASP Cheat Sheet Series : CC BY-SA 4.0, © OWASP Foundation
- OWASP Juice Shop (MIT), OWASP ZAP (Apache 2.0), ChromaDB (Apache 2.0), Ollama (MIT)
- Modèle Llama 3.2 : licence communautaire de Meta

