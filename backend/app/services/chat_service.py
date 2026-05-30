"""
chat_service.py
---------------
This is the "generation" half of RAG. It runs every time a user asks a
question:

  1. RETRIEVE : ask the vector store for the most relevant chunks
                (this is the "Retrieval" in Retrieval-Augmented Generation)
  2. BUILD    : stuff those chunks into a prompt as "context"
  3. GENERATE : send the prompt to Gemini and get a grounded answer
                (this is the "Generation")
  4. CITE     : return which chunks/pages were used as Sources

Why do this instead of just asking Gemini directly?
  - Gemini doesn't know the contents of YOUR private PDF.
  - By feeding it the relevant text, answers are accurate and grounded,
    and we can show the user exactly where each answer came from.
"""

from __future__ import annotations

from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.services.vector_store import get_vector_store


# The instruction we give Gemini. Keeping it strict reduces "hallucination"
# (the model making things up). We tell it to rely only on the context.
SYSTEM_PROMPT = """You are InsightPDF AI, a helpful research assistant.
Answer the user's question using ONLY the context provided below, which was
extracted from their uploaded PDF.

Rules:
- If the answer is not contained in the context, say you could not find it
  in the document. Do not invent facts.
- Be clear and concise. Use simple language.
- When useful, mention the page number(s) the information came from.

Context from the document:
{context}

Question: {question}

Answer:"""


def _build_context(chunks: list[dict]) -> str:
    """
    Format retrieved chunks into a readable block for the prompt.
    We label each with its page so Gemini can cite pages naturally.
    """
    parts = []
    for c in chunks:
        parts.append(f"[Page {c['page']}]\n{c['text']}")
    return "\n\n---\n\n".join(parts)


def answer_question(document_id: str, question: str) -> dict:
    """
    Run the full RAG query pipeline and return an answer + sources.
    """
    settings = get_settings()
    store = get_vector_store()

    # 1. RETRIEVE the most relevant chunks for this question.
    chunks = store.search(
        document_id=document_id,
        query=question,
        top_k=settings.top_k,
    )

    if not chunks:
        return {
            "answer": (
                "I couldn't find anything in this document to answer that. "
                "Make sure the PDF was processed and try rephrasing."
            ),
            "sources": [],
        }

    # 2. BUILD the prompt with the retrieved context.
    context = _build_context(chunks)
    prompt = SYSTEM_PROMPT.format(context=context, question=question)

    # 3. GENERATE the answer with Gemini.
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.google_api_key,
        temperature=0.2,  # low = more factual, less "creative"
    )
    response = llm.invoke(prompt)
    answer_text = response.content if hasattr(response, "content") else str(response)

    # 4. CITE — build the sources list (short snippet preview per chunk).
    sources = [
        {
            "page": c["page"],
            "chunk_index": c["chunk_index"],
            "snippet": (c["text"][:200] + "...") if len(c["text"]) > 200 else c["text"],
        }
        for c in chunks
    ]

    return {"answer": answer_text, "sources": sources}
