# AI Knowledge Base Chatbot (RAG System)

A production-ready PDF Knowledge Base AI Chatbot built with Next.js, NestJS, FastAPI, LangChain, LangGraph, Redis Pub/Sub, PostgreSQL, and ChromaDB.

## Live Demo & Deployment

- **Frontend (Vercel):** [Add your Vercel deployment URL here]
- **Backend:** Not deployed yet (requires persistent compute + DB)
- **Video Demo:** [Add your Loom/YouTube link here]

## Architecture

```
Next.js Frontend
       │
       ▼
Node.js Backend (NestJS)
       │
  Redis Pub/Sub
       │
       ▼
Python AI Service (FastAPI + LangChain + LangGraph)
       │
       ▼
Vector Database (ChromaDB)
       │
       ▼
Database (PostgreSQL)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, TypeORM, PostgreSQL |
| AI Service | Python, FastAPI, LangChain, LangGraph, OpenAI |
| Vector DB | ChromaDB |
| Message Bus | Redis Pub/Sub |
| DevOps | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API Key (get one at https://platform.openai.com)

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd jd-ai-knowledge-chatbot
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Run Everything

```bash
docker-compose up --build -d
```

Wait for all services to start (about 60-90 seconds on first run).

### 3. Access the App

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Admin Panel | http://localhost:3000/admin/login |
| Backend API | http://localhost:3001 |
| AI Service | http://localhost:8000/docs |
| ChromaDB | http://localhost:8001 |

### 4. Seed Admin User

The backend automatically creates an admin user on first run:
- **Email:** `admin@rag.com`
- **Password:** `admin123`

> Change this in production immediately.

## Project Structure

```
ai-knowledge-chatbot/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/          # Next.js 14 + shadcn/ui
├── backend/           # NestJS + TypeORM
└── ai-service/        # FastAPI + LangGraph
```

## Features

### Admin Panel
- Secure JWT authentication
- Dashboard with stats (total PDFs, chat sessions, questions)
- Upload / List / Search / Delete / Reprocess PDFs
- Automatic text extraction, chunking, embedding, and vector storage

### Public AI Chat
- ChatGPT-style interface
- Streaming responses with markdown rendering
- Source citations (document name + page number)
- 3-5 suggested follow-up questions after every answer
- Conversation memory for multi-turn chats
- Fully responsive UI

### AI Pipeline (LangGraph)
```
Receive Question
       │
       ▼
Retrieve Context (ChromaDB vector search)
       │
       ▼
Generate Answer (OpenAI GPT-4o-mini)
       │
       ▼
Generate Suggested Questions
       │
       ▼
Return Response
```

### Communication
- Backend and AI service communicate exclusively via Redis Pub/Sub
- Correlation IDs ensure request/response matching
- No direct HTTP calls between backend and AI service for AI tasks

## API Documentation

Once running, access:
- Backend Swagger: http://localhost:3001/api
- AI Service Swagger: http://localhost:8000/docs

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM and embeddings |
| `DATABASE_URL` | No | Override database connection string |
| `REDIS_URL` | No | Override Redis connection string |

## Evaluation Checklist

- [x] Next.js Frontend (App Router, TypeScript, Tailwind, shadcn/ui)
- [x] Node.js Backend (NestJS, TypeScript)
- [x] Python AI Service (FastAPI, LangChain, LangGraph)
- [x] Redis Pub/Sub Integration
- [x] PostgreSQL Database with TypeORM
- [x] ChromaDB Vector Database
- [x] PDF Upload & Processing
- [x] RAG Pipeline with Source Citations
- [x] Suggested Follow-up Questions
- [x] Conversation Memory
- [x] Streaming Responses
- [x] Docker Compose Setup
- [x] Clean Architecture & MVC Pattern

## License

MIT
