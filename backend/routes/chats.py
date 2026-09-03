import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from middleware.auth_middleware import get_session_id
from services.database import (
    list_chats,
    create_chat,
    get_messages,
    delete_chat,
    get_chat_by_id,
)
from services.vectorstore import delete_chat_documents

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatCreate(BaseModel):
    title: str = Field(default="New conversation", max_length=100)


@router.get("/chats")
async def chats(session_id: str = Depends(get_session_id)):
    try:
        return {"chats": list_chats(session_id)}
    except Exception:
        logger.exception("Failed to list chats")
        raise HTTPException(status_code=500, detail="Failed to load chats")


@router.post("/chats", status_code=status.HTTP_201_CREATED)
async def new_chat(payload: ChatCreate, session_id: str = Depends(get_session_id)):
    try:
        return create_chat(session_id, payload.title.strip() or "New conversation")
    except Exception:
        logger.exception("Failed to create chat")
        raise HTTPException(status_code=500, detail="Failed to create chat")


@router.get("/chats/{chat_id}/messages")
async def chat_messages(chat_id: str, session_id: str = Depends(get_session_id)):
    try:
        messages = get_messages(chat_id, session_id)
        if messages is None:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to load chat messages")
        raise HTTPException(status_code=500, detail="Failed to load chat messages")


@router.delete("/chats/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_endpoint(chat_id: str, session_id: str = Depends(get_session_id)):
    try:
        chat = get_chat_by_id(chat_id, session_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        delete_chat_documents(chat_id, session_id)
        delete_chat(chat_id, session_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete chat")
        raise HTTPException(status_code=500, detail="Failed to delete chat")

