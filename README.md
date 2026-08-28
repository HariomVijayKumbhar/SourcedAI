# SourceAI

A RAG-based (Retrieval-Augmented Generation) knowledge assistant that lets you upload documents (PDF and DOCX) and ask questions about them. The AI answers using only the uploaded content and cites its sources.

## What It Does

1. **Document Upload** — Upload PDF or DOCX files (up to 10 MB each)
2. **Text Extraction** — Extracts text using pdfplumber (PDFs) and python-docx (DOCX)
3. **Text Chunking** — Splits documents into overlapping chunks (~600 tokens, 150-token overlap)
4. **Embedding Generation** — Converts chunks to vectors using `all-MiniLM-L6-v2` (Sentence Transformers, local)
5. **Vector Storage** — Stores embeddings with metadata (source document, chunk index) in ChromaDB
6. **Similarity Search** — Retrieves the top-5 most relevant chunks for each question
7. **Answer Generation** — LLM (OpenAI or Anthropic) generates an answer using only the retrieved context
8. **Source Citation** — Each answer includes references to the source document and chunk

If no relevant context is found, the AI responds with: *"I don't have enough information to answer that from the uploaded documents."* — it never hallucinates.

## Architecture

```
SourceAI/
├── backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── config.py            # Environment variables / settings
│   ├── rate_limiter.py      # SlowAPI rate limiter (shared)
│   ├── routes/
│   │   ├── upload.py        # Document upload endpoint
│   │   └── query.py         # Question-answering endpoint
│   ├── services/
│   │   ├── extractor.py     # PDF/DOCX text extraction
│   │   ├── chunker.py       # Text chunking with overlap
│   │   ├── embeddings.py    # Sentence Transformer embeddings
│   │   ├── vectorstore.py   # ChromaDB operations
│   │   └── llm.py           # LLM call + prompt construction
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.jsx         # Main UI: upload + chat
│   │   ├── layout.jsx       # Root layout
│   │   └── globals.css      # Tailwind base styles
│   ├── components/
│   │   ├── UploadBox.jsx    # Drag-and-drop file upload
│   │   ├── ChatWindow.jsx   # Message list and loading state
│   │   └── SourceCard.jsx   # Displays cited sources
│   ├── lib/
│   │   └── api.js           # API helper (base URL from env)
│   ├── package.json
│   ├── tailwind.config.js
│   ├── jsconfig.json
│   └── .env.local.example
├── render.yaml              # Render deployment config
├── .gitignore
└── README.md
```

## Tech Stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Backend     | Python, FastAPI, Uvicorn             |
| Frontend    | Next.js 15 (App Router), Tailwind CSS |
| Vector Store| ChromaDB (local, file-based)         |
| Embeddings  | Sentence Transformers (`all-MiniLM-L6-v2`) |
| LLM         | OpenRouter, OpenAI, or Anthropic (configurable) |
| Text Extract| pdfplumber, python-docx              |
| Rate Limit  | slowapi                              |

## Security

- **API keys** stored in `.env` (never hard-coded, never committed)
- **File validation**: type check (`.pdf`/`.docx` only) and size limit (10 MB)
- **Filename sanitization**: path traversal prevention on all uploaded files
- **Rate limiting**: 20 requests/minute per IP on upload and query endpoints
- **CORS**: restricted to the configured frontend origin (via `ALLOWED_ORIGIN` env var)
- **Input validation**: all user input validated on both frontend and backend
- **Error handling**: internal errors logged server-side; only generic messages returned to clients
- **No stack traces** exposed in API responses

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- An OpenRouter API key (or OpenAI / Anthropic key)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and set your API key:
#   OPENROUTER_API_KEY=sk-or-v1-your-key-here
#   LLM_PROVIDER=openrouter
#   LLM_MODEL=openai/gpt-4o-mini
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The API will be available at `http://localhost:8001`. Swagger UI docs at `http://localhost:8001/docs`.

### Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

**Backend** (`.env` in `backend/`):

| Variable             | Description                          | Default                         |
|---------------------|--------------------------------------|---------------------------------|
| `LLM_PROVIDER`      | `openrouter`, `openai`, or `anthropic`| `openrouter`                    |
| `OPENROUTER_API_KEY`| OpenRouter API key                   | (required for OpenRouter)       |
| `OPENAI_API_KEY`    | OpenAI API key                       | (optional / for direct OpenAI)  |
| `ANTHROPIC_API_KEY` | Anthropic API key                    | (optional / for direct Anthropic)|
| `LLM_MODEL`         | Model name                           | `openai/gpt-4o-mini`            |
| `ALLOWED_ORIGIN`    | Frontend URL for CORS                | `http://localhost:3000`         |
| `PORT`              | Server port                          | `8001`                          |
| `MAX_FILE_SIZE_MB`  | Max upload size                      | `10`                            |
| `MAX_TOKENS`        | Max tokens in LLM response           | `1000`                          |
| `TEMPERATURE`       | LLM temperature                      | `0.2`                           |

**Frontend** (`.env.local` in `frontend/`):

| Variable             | Description                | Default                |
|---------------------|----------------------------|------------------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL     | `http://localhost:8001`|

## Usage

1. Start the backend and frontend (see Setup above)
2. Open `http://localhost:3000` in your browser
3. Drag and drop a PDF or DOCX file onto the upload area
4. Wait for processing to complete (you'll see a success message)
5. Type a question about the document content and press Enter or click "Send Question"
6. Read the AI's answer with cited sources

### API Endpoints

| Method | Path                | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/health`           | Health check                             |
| POST   | `/api/upload`       | Upload a PDF or DOCX file                |
| GET    | `/api/documents/count` | Get number of stored document chunks  |
| POST   | `/api/query`        | Ask a question (returns `answer` + `sources`) |

## Deploy

### Deploy Frontend (Vercel)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import the repository
3. Set the **Root Directory** to `frontend`
4. In **Project Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` → the live backend URL (e.g., `https://sourceai-backend.onrender.com`)
5. Deploy

### Deploy Backend (Render)

1. Go to [Render](https://render.com) and create a new **Web Service**
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. Set **Build Command** to: `pip install -r requirements.txt`
5. Set **Start Command** to: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. In the **Environment** tab, add these environment variables:
   - `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
   - `LLM_PROVIDER` (`openai` or `anthropic`)
   - `ALLOWED_ORIGIN` → the live Vercel URL (e.g., `https://sourceai.vercel.app`)
7. Deploy
8. After the frontend deploys, go back to Render and update `ALLOWED_ORIGIN` to the live Vercel URL, then redeploy the backend

### End-to-End Flow (first-time deploy)

1. Push to GitHub
2. **Render**: Create web service from `backend/` directory, set env vars, deploy
3. **Vercel**: Import from `frontend/` directory, set `NEXT_PUBLIC_API_URL` to the Render URL, deploy
4. **Render**: Update `ALLOWED_ORIGIN` to the live Vercel URL, redeploy backend

## Known Limitations

- **Ephemeral storage on Render**: ChromaDB stores vectors locally. On Render (free plan), the filesystem is ephemeral — all uploaded documents and their embeddings are lost on redeploy. Attach a persistent disk or re-upload documents after each redeploy. For production, consider a managed ChromaDB or a cloud vector database.
- **Local embeddings only**: The `all-MiniLM-L6-v2` model runs locally (CPU). First request takes ~10-30 seconds to load the model; subsequent requests are fast.
- **No authentication**: The API is open. For production, add API key authentication or user authentication.
- **Single collection**: All documents are stored in a single ChromaDB collection. There is no multi-user isolation.
- **No document deletion**: Once uploaded, documents cannot be individually removed. Use `clear_collection()` in `vectorstore.py` to clear all documents.
- **File types**: Only PDF and DOCX are supported. Other formats (TXT, PPTX, images) are rejected with a 400 error.
- **Chunk size**: Fixed at ~600 tokens with 150-token overlap. Not configurable via the API.
- **Context window**: The LLM prompt context is truncated to ~6000 characters of retrieved chunks.
