import os
import logging
import uuid
from typing import List, Dict, Any, Optional

import chromadb

from config import get_settings
from services.embeddings import generate_embeddings

logger = logging.getLogger(__name__)

_client: chromadb.PersistentClient = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        settings = get_settings()
        persist_dir = settings.chroma_persist_dir
        os.makedirs(persist_dir, exist_ok=True)
        _client = chromadb.PersistentClient(path=persist_dir)
    return _client


def _get_collection():
    client = _get_client()
    return client.get_or_create_collection(name="sourceai_documents")


def add_documents(
    chunks: List[str],
    embeddings: List[List[float]],
    metadata_list: List[Dict[str, Any]],
    chat_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> List[str]:
    if not chunks:
        return []
    collection = _get_collection()
    ids = [str(uuid.uuid4()) for _ in chunks]
    for meta in metadata_list:
        if chat_id:
            meta["chat_id"] = chat_id
        if user_id:
            meta["user_id"] = user_id
    collection.add(
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadata_list,
        ids=ids,
    )
    logger.info(f"Added {len(chunks)} documents to ChromaDB" + (f" for chat {chat_id}" if chat_id else ""))
    return ids


def search(query: str, top_k: int = 5, chat_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    collection = _get_collection()

    where_filter = {}
    if chat_id:
        where_filter["chat_id"] = chat_id
    elif user_id:
        where_filter["user_id"] = user_id
    scoped_count = collection.count() if not where_filter else len(collection.get(where=where_filter).get("ids", []))
    if scoped_count == 0:
        return {"documents": [], "metadatas": [], "distances": []}

    n_results = min(top_k, scoped_count)
    query_embeddings = generate_embeddings([query])

    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=n_results,
        where=where_filter if where_filter else None,
        include=["documents", "metadatas", "distances"],
    )
    return {
        "documents": results.get("documents", [[]])[0],
        "metadatas": results.get("metadatas", [[]])[0],
        "distances": results.get("distances", [[]])[0],
    }


def delete_chat_documents(chat_id: str) -> int:
    if not chat_id:
        return 0
    collection = _get_collection()
    result = collection.get(where={"chat_id": chat_id})
    ids = result.get("ids", [])
    if ids:
        collection.delete(where={"chat_id": chat_id})
    logger.info(f"Deleted {len(ids)} documents for chat {chat_id}")
    return len(ids)


def delete_user_documents(user_id: str) -> int:
    if not user_id:
        return 0
    collection = _get_collection()
    result = collection.get(where={"user_id": user_id})
    ids = result.get("ids", [])
    if ids:
        collection.delete(where={"user_id": user_id})
    logger.info(f"Deleted {len(ids)} documents for user {user_id}")
    return len(ids)


def clear_collection() -> int:
    collection = _get_collection()
    count = collection.count()
    collection.delete(where={})
    logger.info(f"Cleared {count} documents from ChromaDB")
    return count


def get_document_count(chat_id: Optional[str] = None, user_id: Optional[str] = None) -> int:
    collection = _get_collection()
    if chat_id:
        result = collection.get(where={"chat_id": chat_id})
        return len(result.get("ids", []))
    if user_id:
        result = collection.get(where={"user_id": user_id})
        return len(result.get("ids", []))
    return collection.count()
