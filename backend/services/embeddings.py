import logging
from typing import List

from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

logger = logging.getLogger(__name__)
_embedding_function = None


def get_embedding_function():
    global _embedding_function
    if _embedding_function is None:
        logger.info("Loading Chroma ONNX embedding model: all-MiniLM-L6-v2")
        _embedding_function = DefaultEmbeddingFunction()
        logger.info("Embedding model loaded successfully")
    return _embedding_function


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    embeddings = get_embedding_function()(texts)
    return [[float(value) for value in embedding] for embedding in embeddings]
