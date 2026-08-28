import logging
from typing import List

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)
_model: SentenceTransformer = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading sentence transformer model: all-MiniLM-L6-v2")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded successfully")
    return _model


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return [embedding.tolist() for embedding in embeddings]
