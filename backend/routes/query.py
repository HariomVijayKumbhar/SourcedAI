import logging
from typing import List

from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel, Field, field_validator

from services.vectorstore import search, get_document_count
from services.llm import generate_answer, is_llm_configured
from services.database import add_message, get_chat_by_id
from middleware.auth_middleware import get_current_user
from rate_limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()


class HistoryMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    question: str
    chat_id: str | None = None
    history: List[HistoryMessage] = Field(default_factory=list)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question must not be empty")
        if len(v) > 1000:
            raise ValueError("Question is too long (max 1000 characters)")
        return v.strip()


class SourceInfo(BaseModel):
    source_document: str
    chunk_index: int
    total_chunks: int
    distance: float


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]


@router.post("/query", response_model=QueryResponse)
@limiter.limit("20/minute")
async def query_document(request: Request, req: QueryRequest, user: dict = Depends(get_current_user)):
    if req.chat_id:
        chat = get_chat_by_id(req.chat_id, user["user_id"])
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM provider API key is not configured. Please set the appropriate environment variable.",
        )

    doc_count = get_document_count(chat_id=req.chat_id)
    if doc_count == 0:
        return QueryResponse(
            answer="I don't have enough information to answer that from the uploaded documents. No documents have been uploaded to this chat yet.",
            sources=[],
        )

    try:
        results = search(req.question, top_k=5, chat_id=req.chat_id)
    except Exception as e:
        logger.error(f"Error during similarity search: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to search documents")

    retrieved_chunks = results.get("documents", [])
    retrieved_metadata = results.get("metadatas", [])
    distances = results.get("distances", [])

    if not retrieved_chunks or not any(retrieved_chunks):
        return QueryResponse(
            answer="I don't have enough information to answer that from the uploaded documents.",
            sources=[],
        )

    try:
        history_context = "\n".join(
            f"{item.role}: {item.content[:1000]}" for item in req.history[-8:]
            if item.role in {"user", "assistant"} and item.content.strip()
        )
        answer = generate_answer(
            question=req.question,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadata=retrieved_metadata,
            history=history_context,
        )
    except RuntimeError as e:
        logger.error(f"LLM configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Error generating answer from LLM: %s", type(e).__name__, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The answer service is temporarily unavailable. Please try again later.",
        )

    sources = []
    for i, meta in enumerate(retrieved_metadata):
        if meta is None:
            continue
        sources.append(SourceInfo(
            source_document=meta.get("source_document", "unknown"),
            chunk_index=meta.get("chunk_index", i),
            total_chunks=meta.get("total_chunks", len(retrieved_metadata)),
            distance=round(distances[i] if i < len(distances) else 0.0, 4),
        ))

    if req.chat_id:
        try:
            add_message(req.chat_id, "user", req.question)
            add_message(req.chat_id, "assistant", answer, [source.model_dump() for source in sources])
        except Exception:
            logger.exception("Failed to persist chat messages")
    return QueryResponse(answer=answer, sources=sources)
