# Mini RAG App — Presentation Notes

---

## Part 1: Theory

---

### What Problem Are We Solving?

LLMs (like ChatGPT, Llama, etc.) are trained on public internet data up to a cutoff date. They don't know about:
- Your private documents
- Your company's internal knowledge
- Anything written after their training cutoff

**Question:** How do we make an LLM answer questions about *our* data without retraining it?

**Answer:** RAG.

---

### What is RAG?

**RAG = Retrieval-Augmented Generation**

Instead of hoping the LLM already knows the answer, we:
1. **Retrieve** relevant pieces of our data
2. **Augment** the LLM's prompt by injecting those pieces as context
3. Let the LLM **Generate** an answer based on that context

Think of it like an open-book exam — the LLM doesn't need to memorize everything, we hand it the relevant pages before it answers.

**Without RAG:**
```
User: "What is our refund policy?"
LLM: "I don't have access to your company's policies." ❌
```

**With RAG:**
```
User: "What is our refund policy?"
→ System retrieves: "Refunds are available within 30 days of purchase..."
→ LLM sees that context + the question
LLM: "Your refund policy allows returns within 30 days of purchase." ✅
```

---

### How Does RAG Work? (Step by Step)

```
┌─────────────────────────────────────────────────┐
│                  INGESTION PHASE                │
│  (happens once, when you add documents)         │
│                                                 │
│  Document → Split into Chunks → Embed Each      │
│  Chunk → Store Vectors in Database              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                   QUERY PHASE                   │
│  (happens every time the user asks a question)  │
│                                                 │
│  User Question → Embed Question → Search for    │
│  Similar Chunks → Send Chunks + Question to     │
│  LLM → LLM Generates Answer                    │
└─────────────────────────────────────────────────┘
```

Now let's break down each concept.

---

### What Are Embeddings?

An **embedding** is a way to convert text into a list of numbers (a vector) that captures its *meaning*.

```
"The cat sat on the mat"  →  [0.12, -0.45, 0.78, 0.33, ...]  (384 numbers)
"A kitten was on the rug" →  [0.11, -0.43, 0.76, 0.35, ...]  (similar numbers!)
"Stock market crashed"    →  [0.89, 0.12, -0.67, 0.02, ...]  (very different numbers)
```

**Key insight:** Sentences with similar meanings get similar numbers. Sentences with different meanings get different numbers.

This is done by a special ML model (not the chat LLM — a separate, smaller model trained specifically for this task).

**Why do we need this?** Because computers can't search by "meaning" directly. But they *can* compare lists of numbers very fast. Embeddings bridge the gap between human language and mathematical comparison.

---

### What Is Cosine Similarity?

Once we have embeddings (lists of numbers), we need a way to measure **how similar** two pieces of text are.

**Cosine similarity** measures the angle between two vectors:
- **1.0** = identical meaning (vectors point in same direction)
- **0.0** = completely unrelated (vectors are perpendicular)
- **-1.0** = opposite meaning

```
"How do I get a refund?" vs "Refund policy: 30 days..."  → 0.87 (very similar)
"How do I get a refund?" vs "Our office is in Mumbai"     → 0.12 (not similar)
```

**Why cosine and not just distance?** Cosine similarity cares about *direction*, not *magnitude*. A short sentence and a long paragraph about the same topic will still score high, because their vectors point the same way.

---

### What Is Top-K Retrieval?

When the user asks a question, we don't just find the single best match — we find the **K best matches**.

**Top-K = "give me the K most similar chunks"**

Example with K=3:
```
User asks: "What is the return policy?"

Chunk 7:  "Returns accepted within 30 days"         → score: 0.91  ✅ picked
Chunk 12: "Refund processed in 5-7 business days"   → score: 0.85  ✅ picked
Chunk 3:  "Contact support for return labels"       → score: 0.79  ✅ picked
Chunk 21: "Free shipping on orders over $50"        → score: 0.23  ❌ not picked
Chunk 5:  "Our CEO founded the company in 2010"     → score: 0.08  ❌ not picked
```

**Why multiple chunks?** The answer might be spread across different parts of the document. Giving the LLM 3 relevant chunks instead of 1 gives it more context to work with.

**Trade-off:** Too few chunks = might miss relevant info. Too many = adds noise and uses up the LLM's context window.

---

### What Is a Vector Database?

A **vector database** is a specialized database that stores embeddings and lets you search them by similarity.

Regular database:
```sql
SELECT * FROM products WHERE name = 'shoes'   -- exact match
```

Vector database:
```
query([0.12, -0.45, 0.78, ...], topK=3)       -- meaning match
```

It uses mathematical indexes to find the most similar vectors without comparing against every single one (which would be too slow at scale).

---

### Putting It All Together

```
User types: "What's the deadline for the project?"
         │
         ▼
   ┌─────────────┐
   │  Embed the   │  → [0.34, -0.12, 0.56, ...]
   │  question    │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Search vector│  → Find top 3 chunks with highest
   │  database    │    cosine similarity scores
   └──────┬──────┘
          │
          ▼
   ┌─────────────────────────────────────────┐
   │ Build prompt:                           │
   │                                         │
   │ System: "Answer based on this context:" │
   │ Context: [chunk1] [chunk2] [chunk3]     │
   │ User: "What's the deadline?"            │
   └──────┬──────────────────────────────────┘
          │
          ▼
   ┌─────────────┐
   │  Send to LLM │  → "The project deadline is March 15th,
   │  (Groq API)  │     as mentioned in the planning doc."
   └─────────────┘
```

---

## Part 2: What We Built

---

### Tech Stack

| Component | What We Used | Why |
|-----------|-------------|-----|
| **Framework** | Next.js (JavaScript) | Full-stack in one project — frontend + API routes |
| **LLM** | Groq API (Llama 3.3 70B) | Free tier, fast inference, no credit card needed |
| **Embeddings** | @xenova/transformers | Runs locally in Node.js, no API calls, no GPU, free |
| **Vector DB** | Vectra | JSON-file-based, zero infra, cosine similarity built-in |
| **URL Scraping** | Cheerio | Node.js HTML parser, extracts text from web pages |

---

### Why These Choices?

**Groq (not OpenAI, not local GPU):**
- Free API tier with generous limits
- Runs Llama 3.3 70B — a very capable open-source model
- No credit card, just sign up and get an API key
- Extremely fast inference (custom hardware)

**@xenova/transformers (not OpenAI embeddings, not a separate API):**
- Runs entirely in your Node.js process
- No API key needed, no cost, works offline
- Downloads a small model (~30MB) once, then it's cached
- Uses the `all-MiniLM-L6-v2` model — produces 384-dimensional vectors

**Vectra (not Pinecone, not ChromaDB, not pgvector):**
- Zero infrastructure — no Docker, no separate server, no cloud service
- Stores vectors as JSON files on disk
- Built-in cosine similarity search with top-K
- Think of it like SQLite but for vectors

---

### Architecture

```
┌────────────────────────────────────────────────────┐
│                    FRONTEND                        │
│                  (app/page.jsx)                     │
│                                                    │
│  ┌──────────────┐          ┌───────────────────┐  │
│  │  Ingestion    │          │   Chat Panel      │  │
│  │  - Paste text │          │   - Message list  │  │
│  │  - Upload file│          │   - Input box     │  │
│  │  - Scrape URL │          │   - Shows chunks  │  │
│  │  - Clear data │          │                   │  │
│  └──────┬───────┘          └────────┬──────────┘  │
│         │                           │              │
└─────────┼───────────────────────────┼──────────────┘
          │ fetch()                   │ fetch()
          ▼                           ▼
┌────────────────────────────────────────────────────┐
│                  API ROUTES                        │
│                                                    │
│  POST /api/ingest      - Text ingestion            │
│  POST /api/ingest/file - File upload ingestion     │
│  POST /api/ingest/url  - URL scrape + ingest       │
│  POST /api/chat        - RAG query                 │
│  GET  /api/vectors     - Get chunk count           │
│  DELETE /api/vectors   - Clear all data            │
└─────────┬───────────────────────────┬──────────────┘
          │                           │
          ▼                           ▼
┌──────────────────┐    ┌────────────────────────────┐
│   lib/chunker.js │    │     lib/groq.js            │
│   Split text into│    │     Sends context +        │
│   500-char chunks│    │     question to Llama 3.3  │
│   with 50 overlap│    │     via Groq API           │
└────────┬─────────┘    └────────────────────────────┘
         │
         ▼
┌──────────────────┐    ┌────────────────────────────┐
│ lib/embeddings.js│    │   lib/vectorStore.js       │
│ Convert text to  │───▶│   Store/query vectors      │
│ 384-dim vectors  │    │   using Vectra (JSON files) │
│ (runs locally)   │    │   in ./data/vector-index/  │
└──────────────────┘    └────────────────────────────┘
```

---

### The Ingestion Flow (What Happens When You Add Text)

```
1. User pastes text: "Our refund policy allows returns within 30 days..."

2. Chunking (lib/chunker.js):
   - Splits into ~500 character pieces with 50 char overlap
   - Overlap ensures we don't cut a sentence in the middle
     and lose meaning at chunk boundaries

3. Embedding (lib/embeddings.js):
   - Each chunk → all-MiniLM-L6-v2 model → 384 numbers
   - Runs locally, no API call

4. Storage (lib/vectorStore.js):
   - Vector + metadata (original text, source) saved to Vectra
   - Stored as JSON files in ./data/vector-index/
```

---

### The Chat Flow (What Happens When You Ask a Question)

```
1. User asks: "Can I return something after 2 weeks?"

2. Embed the question → [0.34, -0.12, ...]

3. Search Vectra with cosine similarity, top-K=3
   → Returns 3 most relevant chunks with scores

4. Build the prompt:
   System: "You are a helpful assistant. Answer based on this context:"
   Context: [chunk about refund policy] [chunk about returns] [chunk about support]
   User: "Can I return something after 2 weeks?"

5. Send to Groq API (Llama 3.3 70B)

6. Display response + show which chunks were used (expandable)
```

---

### Key Numbers

| Metric | Value |
|--------|-------|
| Embedding model size | ~30MB (downloaded once) |
| Embedding dimensions | 384 numbers per chunk |
| Chunk size | 500 characters |
| Chunk overlap | 50 characters |
| Default top-K | 3 chunks |
| LLM max tokens | 1024 per response |
| Groq free tier | 1,000 requests/day (Llama 3.3 70B) |

---

### Limitations (What This Doesn't Do)

- No semantic chunking (splits by character count, not by meaning)
- No conversation memory (each question is independent)
- No PDF/DOCX support (plain text and markdown only)
- No streaming (waits for full response)
- Single user, local only
- Small-scale only (Vectra is fine for thousands of chunks, not millions)

---

### How To Run It

```bash
# 1. Install dependencies
pnpm install

# 2. Add your Groq API key to .env.local
GROQ_API_KEY=your_key_here

# 3. Start the dev server
pnpm dev

# 4. Open http://localhost:3000
# 5. Paste some text, then ask questions about it
```

---

### Summary

| Concept | One-Liner |
|---------|-----------|
| **RAG** | Give the LLM relevant docs before it answers |
| **Embeddings** | Convert text to numbers that capture meaning |
| **Cosine Similarity** | Math to measure how similar two texts are |
| **Top-K** | Grab the K best matching chunks |
| **Vector DB** | Database optimized for similarity search |
| **Chunking** | Split big text into small searchable pieces |
