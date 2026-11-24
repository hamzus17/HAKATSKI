from pathlib import Path
import chromadb

# Où sont les documents OWASP
SOURCE = Path("data/cheatsheets/cheatsheets")

# Où Chroma range sa base (un dossier local)
client = chromadb.PersistentClient(path="rag/chroma_db")
collection = client.get_or_create_collection("owasp_knowledge")

def decouper(texte, taille=1000, chevauchement=150):
    # Coupe un long texte en morceaux de 1000 caracteres
    morceaux, debut = [], 0
    while debut < len(texte):
        morceaux.append(texte[debut:debut + taille])
        debut += taille - chevauchement
    return morceaux

ids, documents, metadonnees = [], [], []
for fichier in sorted(SOURCE.glob("*.md")):
    texte = fichier.read_text(encoding="utf-8")
    for numero, morceau in enumerate(decouper(texte)):
        ids.append(f"{fichier.stem}-{numero}")
        documents.append(morceau)
        metadonnees.append({"source": fichier.name})

# Envoi a Chroma par lots de 500 (il calcule lui-meme les embeddings)
for debut in range(0, len(ids), 500):
    fin = debut + 500
    collection.upsert(ids=ids[debut:fin], documents=documents[debut:fin], metadatas=metadonnees[debut:fin])

print(f"Termine : {len(ids)} morceaux indexes.")
