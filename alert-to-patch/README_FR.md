# HAKATSUKI — première version locale

Dashboard léger (Python standard library + HTML/CSS/JavaScript). Aucune dépendance Python supplémentaire. Le serveur écoute uniquement sur `127.0.0.1:8765`.

## Installation dans ton projet existant

Depuis Git Bash, décompresse l'archive directement dans le dossier du projet :

```bash
cd /c/dev/alert-to-patch
unzip -o /c/Users/TON_UTILISATEUR/Downloads/HAKATSUKI_v1.zip -d .
```

Remplace le chemin de l'archive par son emplacement réel. Tu dois obtenir :

```text
alert-to-patch/
├── hakatsuki_server.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── start_hakatsuki.sh
├── scanner/
├── rag/
├── output/
└── .venv/
```

Si `frontend/` existe déjà, sauvegarde-le avant l'extraction.

## Démarrage

```bash
cd /c/dev/alert-to-patch
bash start_hakatsuki.sh
```

Puis ouvre `http://127.0.0.1:8765` dans le navigateur. Arrêt du serveur : `Ctrl+C` dans le terminal.

## Connexions prévues

- Alertes : lecture réelle de `output/alertes.json` (champs ZAP `alert`, `risk`, `cweid`, `pluginId`, `url`, `description`, `solution`, etc.).
- Juice Shop : vérification HTTP locale `127.0.0.1:3000`.
- ZAP : vérification de l'API locale `127.0.0.1:8090`.
- Ollama : vérification de `127.0.0.1:11434`, puis analyse à la demande avec `llama3.2:3b` (modifiable via `HAKATSUKI_OLLAMA_MODEL`).
- Scan : le bouton lance `python scanner/run_zap.py`, seulement si Juice Shop et ZAP répondent localement. La clé est lue depuis `ZAP_API_KEY` ou `.zap_key`. Le journal est écrit dans `output/hakatsuki_scan.log`.

## Limites de cette première version

- Le module **OWASP Knowledge** interroge directement la collection ChromaDB `owasp_knowledge` avec `query_texts`, comme dans ton `rag/search.py`, et affiche les trois passages retrouvés avec leur fichier source.
- Le module IA d'analyse d'alerte appelle Ollama à la demande. Il complète la recherche documentaire RAG, mais ne mélange pas automatiquement les extraits OWASP dans l'analyse d'alerte.
- Les statistiques proviennent du dernier `alertes.json`. Si le fichier manque, le dashboard signale l'absence des résultats; il n'invente pas d'alertes.
- Les services sont vérifiés toutes les 12 secondes. Aucune génération IA automatique n'est exécutée.
- Le scan utilise les arguments par défaut de `scanner/run_zap.py`. Avant le premier clic, vérifie que ce script cible bien uniquement `http://localhost:3000`.

## CPU et sécurité

- Pas de framework frontend, pas de dépendance Python additionnelle, pas de base de données supplémentaire.
- Ollama est appelé uniquement à la demande.
- Le serveur est lié à `127.0.0.1`, donc non exposé au réseau local.
- Le scan est destiné à l'environnement local Juice Shop. Ne lance pas de scan sur un site tiers sans autorisation explicite.
