import os
import logging
import uuid

import pdfplumber
from docx import Document
from fastapi import UploadFile

logger = logging.getLogger(__name__)

MAX_PAGES_PDF = 1000


def sanitize_filename(filename: str) -> str:
    if not filename:
        return "unnamed"
    safe = os.path.basename(filename)
    safe = safe.replace("..", "").replace("/", "_").replace("\\", "_")
    safe = "".join(c for c in safe if c.isalnum() or c in (".", "-", "_"))
    if not safe or safe.startswith("."):
        safe = "unnamed_" + safe
    return safe


async def save_upload(file: UploadFile, dest_dir: str, allowed_extensions: tuple, max_bytes: int) -> str:
    if not file.filename:
        raise ValueError("File has no filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise ValueError(f"Unsupported file type: {ext}. Allowed: {', '.join(allowed_extensions)}")

    safe_name = sanitize_filename(file.filename)
    os.makedirs(dest_dir, exist_ok=True)
    # Keep the display name in metadata, but never use user input as a storage path.
    internal_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(dest_dir, internal_name)

    bytes_read = 0
    with open(filepath, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            bytes_read += len(chunk)
            if bytes_read > max_bytes:
                f.close()
                os.remove(filepath)
                actual_mb = bytes_read / (1024 * 1024)
                max_mb = max_bytes / (1024 * 1024)
                raise ValueError(
                    f"File size is {actual_mb:.2f} MB, which exceeds the maximum allowed size of {max_mb:.0f} MB"
                )
            f.write(chunk)

    if bytes_read == 0:
        os.remove(filepath)
        raise ValueError("File is empty")

    with open(filepath, "rb") as f:
        signature = f.read(8)
    if ext == ".pdf" and not signature.startswith(b"%PDF-"):
        os.remove(filepath)
        raise ValueError("The uploaded file is not a valid PDF")
    if ext == ".docx" and not signature.startswith(b"PK"):
        os.remove(filepath)
        raise ValueError("The uploaded file is not a valid DOCX")

    logger.info("Saved uploaded file '%s' (%d bytes)", safe_name, bytes_read)
    return filepath


def extract_text_from_pdf(filepath: str) -> str:
    text_parts = []
    page_count = 0
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages):
            if i >= MAX_PAGES_PDF:
                logger.warning(f"PDF has more than {MAX_PAGES_PDF} pages, stopping at {MAX_PAGES_PDF}")
                break
            text = page.extract_text() or ""
            if text.strip():
                text_parts.append(text)
            page_count += 1
    text = "\n".join(text_parts).strip()
    if page_count == 0 or not text:
        raise ValueError(
            "Could not extract any readable text from this PDF. "
            "It may be a scanned image, encrypted, or contain only non-text content."
        )
    return text


def extract_text_from_docx(filepath: str) -> str:
    doc = Document(filepath)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n".join(paragraphs).strip()
    if not text:
        raise ValueError(
            "Could not extract any readable text from this DOCX. "
            "The document may be empty or contain only non-text content."
        )
    return text


def extract_text(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(filepath)
    elif ext == ".docx":
        return extract_text_from_docx(filepath)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")
