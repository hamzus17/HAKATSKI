import chromadb

client = chromadb.PersistentClient(path="rag/chroma_db")
collection = client.get_collection("owasp_knowledge")

question = input("Pose une question de securite : ")
resultats = collection.query(query_texts=[question], n_results=3)

for texte, meta in zip(resultats["documents"][0], resultats["metadatas"][0]):
    print("-" * 60)
    print("Source :", meta["source"])
    print(texte[:400])
