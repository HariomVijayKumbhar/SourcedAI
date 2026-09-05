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
    logger.info(
        f"Added {len(chunks)} documents to ChromaDB" + (f" for chat {chat_id}" if chat_id else "")
    )
    return ids


def _build_where(
    chat_id: Optional[str], user_id: Optional[str]
) -> tuple[Optional[Dict[str, Any]], bool]:
    if chat_id and user_id:
        return {\"$and\": [{\"chat_id\": chat_id}, {\"user_id\": user_id}]}, False
    if chat_id:
        return {"chat_id": chat_id}, False
    if user_id:
        return {"user_id": user_id}, False
    return None, True


def search(
    query: str,
    top_k: int = 5,
    chat_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    where_filter, blocked = _build_where(chat_id, user_id)
    if blocked:
        return {"documents": [], "metadatas": [], "distances": []}

    collection = _get_collection()
    scoped_count = len(collection.get(where=where_filter).get("ids", []))
    if scoped_count == 0:
        return {"documents": [], "metadatas": [], "distances": []}

    n_results = min(top_k, scoped_count)
    query_embeddings = generate_embeddings([query])
    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=n_results,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
    return {
        "documents": results.get("documents", [[]])[0],
        "metadatas": results.get("metadatas", [[]])[0],
        "distances": results.get("distances", [[]])[0],
    }


def delete_chat_documents(chat_id: str, user_id: Optional[str] = None) -> int:
    if not chat_id:
        return 0
    collection = _get_collection()
    if user_id:
        where_filter = {\"$and\": [{\"chat_id\": chat_id}, {\"user_id\": user_id}]}
    else:
        where_filter = {"chat_id": chat_id}
    result = collection.get(where=where_filter)
    ids = result.get("ids", [])
    if ids:
        collection.delete(ids=ids)
    logger.info(f"Deleted {len(ids)} documents for chat {chat_id}")
    return len(ids)


def clear_collection() -> int:
    collection = _get_collection()
    count = collection.count()
    collection.delete(where={})
    logger.info(f"Cleared {count} documents from ChromaDB")
    return count


def get_document_count(
    chat_id: Optional[str] = None, user_id: Optional[str] = None
) -> int:
    collection = _get_collection()
    where_filter, blocked = _build_where(chat_id, user_id)
    if blocked:
        return 0
    result = collection.get(where=where_filter)
    return len(result.get("ids", []))
