import os
import chromadb
from chromadb.config import Settings
import json

class EmotionMemoryManager:
    def __init__(self, db_path="memory_db"):
        self.use_fallback = False
        try:
            # Explicitly set settings to avoid http-only mode in some environments
            settings = Settings(
                chroma_api_impl="chromadb.api.segment.SegmentAPI",
                is_persistent=True,
                persist_directory=db_path
            )
            self.client = chromadb.PersistentClient(path=db_path, settings=settings)
            self.collection = self.client.get_or_create_collection(name="sentia_memory")
            print("[Memory] ChromaDB initialized successfully.")
        except Exception as e:
            print(f"[Memory] ChromaDB failed to initialize: {e}. Using simple in-memory fallback.")
            self.use_fallback = True
            self.fallback_data = [] # List of {text, metadata, id}

    def add_memory(self, user_id: int, message_id: int, text: str, emotion_state: str, topic: str = "general"):
        if not text.strip():
            return
        
        if self.use_fallback:
            self.fallback_data.append({
                "text": text,
                "metadata": {"user_id": user_id, "emotion_state": emotion_state, "topic": topic},
                "id": f"msg_{message_id}"
            })
            return

        try:
            self.collection.add(
                documents=[text],
                metadatas=[{"user_id": user_id, "emotion_state": emotion_state, "topic": topic}],
                ids=[f"msg_{message_id}"]
            )
        except Exception as e:
            print(f"[Memory] Failed to add memory: {e}")

    def retrieve_context(self, user_id: int, query: str, current_emotion: str, n_results: int = 10):
        if self.use_fallback:
            # Simple keyword overlap retrieval
            query_words = set(query.lower().split())
            matches = []
            for item in self.fallback_data:
                if item['metadata']['user_id'] == user_id:
                    doc_words = set(item['text'].lower().split())
                    overlap = len(query_words.intersection(doc_words))
                    if overlap > 0:
                        matches.append({
                            "text": item['text'],
                            "emotion_state": item['metadata']['emotion_state'],
                            "topic": item['metadata']['topic'],
                            "score": overlap / len(query_words) # crude score
                        })
            
            # Boost emotional matches in fallback too
            for m in matches:
                if m['emotion_state'] == current_emotion:
                    m['score'] *= 1.5
                    
            matches.sort(key=lambda x: x['score'], reverse=True)
            return matches[:3]

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where={"user_id": user_id}
            )
        except Exception as e:
            print(f"[Memory] Retrieval Error: {e}")
            return []

        if not results or not results['documents'] or not results['documents'][0]:
            return []

        docs = results['documents'][0]
        metadatas = results['metadatas'][0]
        distances = results['distances'][0] if 'distances' in results and results['distances'] else [0] * len(docs)

        # Rerank to prioritize emotional similarity
        ranked_results = []
        for doc, meta, dist in zip(docs, metadatas, distances):
            score = 1.0 / (1.0 + dist) # base semantic score
            
            # Boost if same emotional state
            if meta.get("emotion_state") == current_emotion:
                score *= 1.5
            
            ranked_results.append({
                "text": doc,
                "emotion_state": meta.get("emotion_state"),
                "topic": meta.get("topic"),
                "score": score
            })

        # Sort by score descending
        ranked_results.sort(key=lambda x: x['score'], reverse=True)
        
        return ranked_results[:3]

memory_manager = EmotionMemoryManager()
