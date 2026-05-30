# InsightPDF AI

> **Turn Documents into Actionable Insights.**
> Upload a PDF, ask questions in plain English, and get answers grounded in your document — with the exact pages cited.

This is a complete, beginner-friendly **RAG** (Retrieval-Augmented Generation) application. If you've never built a RAG system before, read the **"RAG in plain English"** section first — it explains the whole idea before you touch any code.

---

## Table of contents

1. [RAG in plain English](#1-rag-in-plain-english)
2. [System architecture](#2-system-architecture)
3. [Project folder structure](#3-project-folder-structure)
4. [Data / "database" structure](#4-data--database-structure)
5. [API endpoints](#5-api-endpoints)
6. [Step-by-step: how it all works](#6-step-by-step-how-it-all-works)
7. [Setup instructions](#7-setup-instructions)
8. [Deployment guide](#8-deployment-guide)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. RAG in plain English

Large language models (like Gemini) are smart, but they **don't know the contents of your private PDF**. If you just paste your question, the model guesses — and may "hallucinate" (make things up).

**RAG fixes this with a simple idea:** before asking the AI, first *find* the most relevant pieces of your document, then *hand them to the AI* along with your question. The AI answers using that real context.

Think of it like an open-book exam:

| Closed book (plain LLM)        | Open book (RAG)                                   |
| ------------------------------ | ------------------------------------------------- |
| Answer from memory only        | Look up the relevant page, *then* answer          |
| Can be wrong or made-up        | Grounded in your actual document                  |
| No way to cite a source        | Can point to the exact page used                  |

RAG has two phases:

**A. Ingestion (happens once, when you upload a PDF):**
1. **Extract** text from every page.
2. **Chunk** the text into small overlapping pieces.
3. **Embed** each chunk → turn it into a vector (a list of numbers that captures meaning).
4. **Store** those vectors in a vector database (ChromaDB).

**B. Query (happens every time you ask a question):**
1. **Embed** your question into a vector too.
2. **Retrieve** the chunks whose vectors are closest to the question's vector (most relevant).
3. **Augment** a prompt: "Here is some context… now answer this question."
4. **Generate** the answer with Gemini and show the sources.

That's the entire system. Everything below is just plumbing around those eight steps.

---

## 2. System architecture

```
                          ┌──────────────────────────────────────────┐
                          │                BROWSER                     │
                          │   Next.js + React + TypeScript + Tailwind  │
                          │                                            │
                          │  Landing page   →   Chat dashboard         │
                          │  (UploadCard)       (PdfViewer +           │
                          │                      ChatInterface +       │
                          │                      SourcesPanel)         │
                          └───────────────┬────────────────────────────┘
                                          │  HTTP (JSON / multipart)
                                          ▼
                          ┌──────────────────────────────────────────┐
                          │              FastAPI BACKEND               │
                          │                                            │
                          │  /api/upload   /api/chat   /api/history    │
                          │  /api/documents  /api/file/{id}            │
                          │                                            │
                          │  ┌────────────┐  ┌──────────────────────┐  │
                          │  │ pdf_service │  │     chat_service     │  │
                          │  │ extract     │  │ retrieve → prompt →  │  │
                          │  │ chunk       │  │ generate (Gemini)    │  │
                          │  └─────┬──────┘  └──────────┬───────────┘  │
                          │        │ embed + store      │ retrieve     │
                          │        ▼                    ▼              │
                          │      ┌─────────────────────────────┐      │
                          │      │      vector_store (Chroma)   │      │
                          │      └─────────────────────────────┘      │
                          └───────────────┬────────────────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
          ┌──────────────┐      ┌──────────────────┐    ┌──────────────────┐
          │  ChromaDB     │      │  Google Gemini    │    │  Local disk       │
          │ (vectors on   │      │  - embeddings     │    │  uploads/*.pdf    │
          │  disk)        │      │  - chat model     │    │  _meta/*.json     │
          └──────────────┘      └──────────────────┘    └──────────────────┘
```

**Why this split?**
- The **frontend** is purely presentation — it never talks to Gemini or Chroma directly. It only calls our own API. This keeps your API key secret on the server.
- The **backend** does all the heavy lifting (PDF parsing, embeddings, retrieval, generation).
- **ChromaDB** and the JSON metadata files persist to disk so data survives restarts.

---

## 3. Project folder structure

```
insightpdf-ai/
├── README.md                     ← you are here
├── run-backend.sh                ← one-command backend start (Mac/Linux)
├── run-frontend.sh               ← one-command frontend start
├── .gitignore
│
├── backend/                      ← Python + FastAPI
│   ├── requirements.txt
│   ├── .env.example              ← copy to .env and add your Gemini key
│   ├── uploads/                  ← raw uploaded PDFs land here
│   ├── chroma_db/                ← ChromaDB vector storage (+ _meta/*.json)
│   └── app/
│       ├── main.py               ← FastAPI app + CORS + router wiring
│       ├── core/
│       │   └── config.py         ← reads settings from .env
│       ├── models/
│       │   └── schemas.py        ← request/response shapes (Pydantic)
│       ├── routers/
│       │   ├── upload.py         ← /api/upload, /api/documents, /api/file
│       │   └── chat.py           ← /api/chat, /api/history
│       └── services/
│           ├── pdf_service.py    ← extract + chunk + process pipeline
│           ├── vector_store.py   ← ChromaDB + Gemini embeddings wrapper
│           ├── chat_service.py   ← retrieve + prompt + Gemini generate
│           └── storage_service.py← JSON storage for metadata + history
│
└── frontend/                     ← Next.js + React + TypeScript + Tailwind
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts        ← theme, dark mode, animations
    ├── postcss.config.mjs
    ├── next.config.mjs
    ├── .env.local.example        ← copy to .env.local (backend URL)
    └── src/
        ├── app/
        │   ├── layout.tsx        ← fonts + global wrapper
        │   ├── globals.css       ← design tokens (light/dark) + Tailwind
        │   ├── page.tsx          ← LANDING PAGE
        │   └── chat/
        │       └── page.tsx      ← CHAT / DASHBOARD PAGE
        ├── components/
        │   ├── UploadCard.tsx    ← drag-and-drop PDF upload
        │   ├── ChatInterface.tsx ← message list + input
        │   ├── SourcesPanel.tsx  ← shows cited chunks/pages
        │   ├── PdfViewer.tsx     ← embedded PDF preview
        │   ├── Sidebar.tsx       ← brand + current doc + history
        │   └── ThemeToggle.tsx   ← light/dark switch
        ├── hooks/
        │   └── useTheme.ts       ← dark mode logic (persists choice)
        ├── lib/
        │   └── api.ts            ← all backend calls in one place
        └── types/
            └── index.ts          ← TypeScript types mirroring the API
```

---

## 4. Data / "database" structure

This beginner build intentionally avoids a full SQL database. It uses two simple stores, both on disk:

### a) ChromaDB (vector store)

One collection called `insightpdf_documents`. Every stored item is one **chunk** with:

| Field         | Type      | Meaning                                            |
| ------------- | --------- | -------------------------------------------------- |
| `id`          | string    | `"{document_id}-{chunk_index}"` (unique)           |
| `embedding`   | float[]   | the vector (created by Gemini, managed by Chroma)  |
| `document`    | string    | the chunk's raw text                               |
| `document_id` | metadata  | which PDF this chunk belongs to (used to filter)   |
| `page`        | metadata  | original PDF page number (for citations)           |
| `chunk_index` | metadata  | position of the chunk within the document          |

When you ask a question, Chroma searches **only** within the matching `document_id`.

### b) JSON metadata (`chroma_db/_meta/`)

**`documents.json`** — one record per uploaded PDF:
```json
{
  "document_id": "a1b2c3...",
  "filename": "research-paper.pdf",
  "num_pages": 12,
  "num_chunks": 47,
  "created_at": "2025-05-30T10:15:00+00:00"
}
```

**`history.json`** — one record per question asked:
```json
{
  "id": "f9e8...",
  "document_id": "a1b2c3...",
  "question": "What dataset was used?",
  "answer": "The study used the MIT-BIH dataset...",
  "sources": [{ "page": 4, "chunk_index": 12, "snippet": "..." }],
  "created_at": "2025-05-30T10:16:30+00:00"
}
```

> **Upgrading later:** because all reads/writes go through `storage_service.py`, you can swap these JSON files for SQLite or Postgres by editing only that one file.

---

## 5. API endpoints

Base URL (local): `http://localhost:8000`
Interactive docs (auto-generated): `http://localhost:8000/docs`

| Method | Path                  | Purpose                                  | Body / Params                              | Returns                              |
| ------ | --------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------ |
| GET    | `/`                   | Health check                             | —                                          | `{status, service, docs}`            |
| POST   | `/api/upload`         | Upload + process a single PDF            | `multipart/form-data` field `file`         | `UploadResponse`                     |
| GET    | `/api/documents`      | List all processed documents             | —                                          | `{ items: DocumentItem[] }`          |
| GET    | `/api/file/{id}`      | Serve the raw PDF (for the viewer)       | path `id`                                  | `application/pdf`                    |
| POST   | `/api/chat`           | Ask a question about a document          | JSON `{ document_id, question }`           | `ChatResponse` (answer + sources)    |
| GET    | `/api/history`        | Get stored Q&A                           | query `document_id` (optional)             | `{ items: HistoryItem[] }`           |

**Example: ask a question**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"document_id":"a1b2c3...","question":"Summarize the conclusion."}'
```
```json
{
  "answer": "The paper concludes that ...",
  "sources": [
    { "page": 11, "chunk_index": 44, "snippet": "In conclusion, the model ..." }
  ]
}
```

---

## 6. Step-by-step: how it all works

Follow the data as it flows through the code.

**Upload (ingestion):**
1. User drops a PDF on `UploadCard.tsx` → it calls `uploadPdf()` in `lib/api.ts`.
2. That hits `POST /api/upload` in `routers/upload.py`.
3. The router saves the file to `uploads/{document_id}.pdf` and calls `pdf_service.process_pdf()`.
4. `process_pdf()` runs `extract_pages()` (pypdf) → `chunk_pages()` (RecursiveCharacterTextSplitter) → `vector_store.add_chunks()`.
5. `add_chunks()` asks Gemini for embeddings and stores them in ChromaDB with metadata.
6. The router records the document in `documents.json` and returns a `document_id`.
7. The frontend stores that doc in `sessionStorage` and navigates to `/chat?doc={id}`.

**Ask (query):**
1. User types a question in `ChatInterface.tsx` → calls `askQuestion()` → `POST /api/chat`.
2. `routers/chat.py` confirms the document exists, then calls `chat_service.answer_question()`.
3. `answer_question()` calls `vector_store.search()` to get the top-K relevant chunks (filtered to this document).
4. It builds a prompt embedding that context + the question, and calls Gemini (`ChatGoogleGenerativeAI`).
5. It returns the answer + a `sources` list (page, chunk index, snippet).
6. The router saves the exchange to `history.json` and returns it.
7. `ChatInterface` shows the answer; `SourcesPanel` shows the cited chunks; the `Sidebar` history updates.

---

## 7. Setup instructions

### Prerequisites
- **Python 3.11+** (3.12 recommended)
- **Node.js 18.18+** (20+ recommended)
- A **free Google Gemini API key** → https://aistudio.google.com/app/apikey

### Step 1 — Get the code
Put the `insightpdf-ai/` folder somewhere on your machine and open a terminal in it.

### Step 2 — Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Mac/Linux:
source .venv/bin/activate
# Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create your .env from the template and add your key
cp .env.example .env
#   then edit .env and set:  GOOGLE_API_KEY=your_real_key

# Start the server
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** — you should see the interactive API docs. Leave this running.

> **Windows note:** if `cp` isn't available, just copy `.env.example` to `.env` in File Explorer.

### Step 3 — Frontend (in a new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Create your local env from the template
cp .env.local.example .env.local
#   default value (http://localhost:8000) is correct for local dev

# Start the dev server
npm run dev
```

Visit **http://localhost:3000** → upload a PDF → start chatting.

### One-command shortcuts (Mac/Linux)
From the project root:
```bash
./run-backend.sh     # terminal 1
./run-frontend.sh    # terminal 2
```

---

## 8. Deployment guide

A clean, free-tier-friendly split: **backend on Render**, **frontend on Vercel**.

### Backend → Render (or Railway / Fly.io)

1. Push the repo to GitHub.
2. On Render, create a **New Web Service** from the repo, root directory `backend`.
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables:**
   - `GOOGLE_API_KEY` = your key
   - `FRONTEND_ORIGINS` = your Vercel URL, e.g. `https://insightpdf.vercel.app`
6. **Persistent disk:** add a disk mounted at `/opt/render/project/src/backend` (or set `CHROMA_DIR`/`UPLOAD_DIR` to a mounted path) so ChromaDB and uploads survive restarts. Without a persistent disk, your vectors reset on each deploy.

> **Heads-up for serverless platforms:** ChromaDB and uploaded files need a writable, persistent filesystem. Render/Railway with a disk work well. Pure serverless (e.g. Vercel functions) does not persist local files — for that you'd switch to a hosted vector DB (e.g. Chroma Cloud, Pinecone) and object storage (e.g. S3).

### Frontend → Vercel

1. On Vercel, **Import Project** from the same repo, root directory `frontend`.
2. Framework preset: **Next.js** (auto-detected).
3. **Environment variable:**
   - `NEXT_PUBLIC_API_URL` = your Render backend URL, e.g. `https://insightpdf-api.onrender.com`
4. Deploy. Vercel gives you a public URL.
5. Go back to Render and make sure `FRONTEND_ORIGINS` matches that exact URL (for CORS).

### Quick checklist
- [ ] Backend `GOOGLE_API_KEY` set
- [ ] Backend `FRONTEND_ORIGINS` = frontend URL
- [ ] Frontend `NEXT_PUBLIC_API_URL` = backend URL
- [ ] Persistent disk attached to backend
- [ ] Upload a PDF on the live site and confirm chat works

---

## 9. Troubleshooting

| Symptom                                            | Likely cause / fix                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `GOOGLE_API_KEY` errors / 500 on upload or chat    | Key missing or invalid in `backend/.env`. Get one from Google AI Studio.           |
| Upload says "No extractable text found"            | The PDF is scanned images. This build doesn't include OCR. Use a text-based PDF.   |
| Frontend can't reach backend / network error       | Backend not running, or `NEXT_PUBLIC_API_URL` is wrong in `.env.local`.            |
| CORS error in browser console                       | Add your frontend URL to `FRONTEND_ORIGINS` in `backend/.env`, then restart it.    |
| Answers seem to ignore the document                 | Make sure you're asking about the same `document_id` you uploaded (re-upload).     |
| Vectors disappear after redeploy                    | Attach a persistent disk and point `CHROMA_DIR` at it.                             |
| `next/font` fetch error during build                | The build machine needs internet to fetch Google Fonts the first time.            |

---

### Tuning knobs (in `backend/.env`)

| Variable         | Default | What it does                                                        |
| ---------------- | ------- | ------------------------------------------------------------------- |
| `CHUNK_SIZE`     | 1000    | Characters per chunk. Bigger = more context per chunk, fewer chunks.|
| `CHUNK_OVERLAP`  | 150     | Overlap between chunks so context isn't lost at boundaries.         |
| `TOP_K`          | 4       | How many chunks to retrieve per question. Higher = more context.    |
| `GEMINI_CHAT_MODEL` | gemini-1.5-flash | Swap for a stronger/cheaper model as needed.             |

---

Built as a learning project. The whole point is that you can read every file end-to-end and understand exactly how a RAG system works. Start with `backend/app/services/pdf_service.py` and `chat_service.py` — those two files *are* the RAG system.
