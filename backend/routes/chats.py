import logging
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from services.database import list_chats, create_chat, get_messages, delete_chat, get_chat_by_id
from services.vectorstore import delete_chat_documents
from middleware.auth_middleware import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatCreate(BaseModel):
    title: str = Field(default="New conversation", max_length=100)


@router.get("/chats")
async def chats(user: dict = Depends(get_current_user)):
    try:
        return {"chats": list_chats(user["user_id"])}
    except Exception:
        logger.exception("Failed to list chats")
        raise HTTPException(status_code=500, detail="Failed to load chats")


@router.post("/chats", status_code=status.HTTP_201_CREATED)
async def new_chat(payload: ChatCreate, user: dict = Depends(get_current_user)):
    try:
        return create_chat(user["user_id"], payload.title.strip() or "New conversation")
    except Exception:
        logger.exception("Failed to create chat")
        raise HTTPException(status_code=500, detail="Failed to create chat")


@router.get("/chats/{chat_id}/messages")
async def chat_messages(chat_id: str, user: dict = Depends(get_current_user)):
    try:
        messages = get_messages(chat_id, user["user_id"])
        if messages is None:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to load chat messages")
        raise HTTPException(status_code=500, detail="Failed to load chat messages")


@router.delete("/chats/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_endpoint(chat_id: str, user: dict = Depends(get_current_user)):
    try:
        chat = get_chat_by_id(chat_id, user["user_id"])
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        delete_chat_documents(chat_id)
        delete_chat(chat_id, user["user_id"])
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete chat")
        raise HTTPException(status_code=500, detail="Failed to delete chat")
