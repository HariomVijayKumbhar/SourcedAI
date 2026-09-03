import json
import logging
import os
import sqlite3
import uuid
from typing import Any, Dict, List, Optional
from config import get_settings
logger = logging.getLogger(__name__)


def _connection() -> sqlite3.Connection:
    settings = get_settings()
    os.makedirs(os.path.dirname(settings.database_path), exist_ok=True)
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connection() as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS chats ("
            "id TEXT PRIMARY KEY, "
            "title TEXT NOT NULL, "
            "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ")"
        )
        db.execute(
            "CREATE TABLE IF NOT EXISTS messages ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE, "
            "role TEXT NOT NULL CHECK(role IN ('user', 'assistant')), "
            "content TEXT NOT NULL, "
            "sources TEXT NOT NULL DEFAULT '[]', "
            "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ")"
        )
        db.execute("CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id, id)")
        db.execute("CREATE INDEX IF NOT EXISTS chats_updated_idx ON chats(updated_at DESC)")
        db.execute("PRAGMA foreign_keys = ON")
        db.commit()


def list_chats() -> List[Dict[str, Any]]:
    with _connection() as db:
        rows = db.execute("SELECT * FROM chats ORDER BY updated_at DESC").fetchall()
        return [{"id": row["id"], "title": row["title"], "messages": []} for row in rows]


def create_chat(title: str = "New conversation") -> Dict[str, Any]:
    chat_id = str(uuid.uuid4())
    with _connection() as db:
        db.execute("INSERT INTO chats (id, title) VALUES (?, ?)", (chat_id, title))
        db.commit()
    return {"id": chat_id, "title": title, "messages": []}


def get_messages(chat_id: str) -> Optional[List[Dict[str, Any]]]:
    with _connection() as db:
        chat = db.execute("SELECT id FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if not chat:
            return None
        rows = db.execute(
            "SELECT role, content, sources FROM messages WHERE chat_id = ? ORDER BY id", (chat_id,)
        ).fetchall()
        return [
            {"role": row["role"], "content": row["content"], "sources": json.loads(row["sources"])}
            for row in rows
        ]


def delete_chat(chat_id: str) -> bool:
    with _connection() as db:
        cursor = db.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        db.commit()
        return cursor.rowcount > 0


def add_message(chat_id: str, role: str, content: str, sources: list | None = None) -> None:
    with _connection() as db:
        db.execute(
            "INSERT OR IGNORE INTO chats (id, title) VALUES (?, ?)",
            (chat_id, content[:48] if role == "user" else "New conversation"),
        )
        db.execute(
            "INSERT INTO messages (chat_id, role, content, sources) VALUES (:chat_id, :role, :content, :sources)",
            {
                "chat_id": chat_id,
                "role": role,
                "content": content,
                "sources": json.dumps(sources or []),
            },
        )
        db.execute(
            "UPDATE chats SET updated_at = CURRENT_TIMESTAMP, "
            "title = CASE WHEN title = 'New conversation' AND ? = 'user' THEN ? ELSE title END "
            "WHERE id = ?",
            (role, content[:48], chat_id),
        )
        db.commit()


def get_chat_by_id(chat_id: str) -> Optional[Dict[str, Any]]:
    with _connection() as db:
        row = db.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if row:
            return {"id": row["id"], "title": row["title"]}
    return None
