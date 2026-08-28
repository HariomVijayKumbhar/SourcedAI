import re
import logging
from typing import List

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE = 600
DEFAULT_CHUNK_OVERLAP = 150


def estimate_tokens(text: str) -> int:
    return len(text) // 4


def split_sentences(text: str) -> List[str]:
    sentence_endings = re.compile(r"(?<=[.!?])\s+")
    parts = sentence_endings.split(text.strip())
    sentences = [p.strip() for p in parts if p.strip()]
    return sentences


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    if not text or not text.strip():
        return []

    sentences = split_sentences(text)
    if not sentences:
        return [text]

    chunks: List[str] = []
    current_chunk: List[str] = []
    current_tokens = 0

    for sentence in sentences:
        sentence_tokens = estimate_tokens(sentence)
        if current_tokens + sentence_tokens > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            overlap_sentences: List[str] = []
            overlap_tokens = 0
            for s in reversed(current_chunk):
                s_tokens = estimate_tokens(s)
                if overlap_tokens + s_tokens > chunk_overlap:
                    break
                overlap_sentences.insert(0, s)
                overlap_tokens += s_tokens
            current_chunk = overlap_sentences
            current_tokens = overlap_tokens
        current_chunk.append(sentence)
        current_tokens += sentence_tokens

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks
