import os
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, status
from pydantic import BaseModel

from config import get_settings
from services.extractor import extract_text, save_upload
from services.chunker import chunk_text
from services.embeddings import generate_embeddings
from services.vectorstore import add_documents, get_document_count
from services.database import get_chat_by_id
from rate_limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadResponse(BaseModel):
    filename: str
    num_chunks: int
    num_chars: int
    message: str
    chat_id: str | None = None


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    chat_id: str | None = Form(None),
):
    settings = get_settings()
    max_bytes = settings.max_file_size_mb * 1024 * 1024

    if chat_id:
        chat = get_chat_by_id(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

    try:
        original_filename = os.path.basename(file.filename or "document")
        filepath = await save_upload(
            file,
            dest_dir=os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
            ),
            allowed_extensions=settings.allowed_extensions,
            max_bytes=max_bytes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save file"
        )

    try:
        raw_text = extract_text(filepath)
    except ValueError as e:
        _safe_remove(filepath, settings)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error extracting text: {e}", exc_info=True)
        _safe_remove(filepath, settings)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract text from file",
        )

    try:
        chunks = chunk_text(raw_text)
        embeddings = generate_embeddings(chunks)
    except Exception as e:
        logger.error(f"Error processing text: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process document",
        )

    metadata_list = [
        {
            "source_document": original_filename,
            "chunk_index": i,
            "total_chunks": len(chunks),
        }
        for i in range(len(chunks))
    ]

    try:
        add_documents(chunks, embeddings, metadata_list, chat_id=chat_id)
    except Exception as e:
        logger.error(f"Error storing documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store document"
        )

    _safe_remove(filepath, settings)
    return UploadResponse(
        filename=original_filename,
        num_chunks=len(chunks),
        num_chars=len(raw_text),
        message=f"Successfully processed {len(chunks)} chunks from the document",
        chat_id=chat_id,
    )


@router.get("/documents/count")
async def document_count(chat_id: str | None = None):
    try:
        count = get_document_count(chat_id=chat_id)
        return {"count": count}
    except Exception as e:
        logger.error(f"Error getting document count: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document count",
        )


def _safe_remove(filepath: str, settings):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"Could not remove temporary file {filepath}: {e}")
