# VibeCheck

**VibeCheck** is a student confession analytics platform. Admins import anonymous student confessions (text posts), and the system automatically analyzes them using NLP and ML to surface sentiment trends, aspect-based insights, and vibe scores — giving administrators a clear picture of student experience across key campus areas.

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite (via `aiosqlite` + SQLAlchemy async)
- **ML Models:** HuggingFace Transformers (DistilBERT), SentenceTransformers, KeyBERT
- **LLM:** Groq API (OpenAI-compatible)
- **Scheduler:** APScheduler (automated vibe snapshot jobs)
- **Auth:** JWT Bearer tokens

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Icons:** Lucide React

---

## Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── aspects.py       # Student aspect keyword definitions
│   │   │   ├── database.py      # SQLite async engine setup
│   │   │   ├── security.py      # JWT auth
│   │   │   └── scheduler.py     # Vibe snapshot cron job
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── routers/             # API route handlers
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic & analytics services
│   │   └── scripts/             # Utility scripts (seed, reset, inspect)
│   └── vibeCheck.db             # SQLite database file
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx             # Admin home (import / analytics)
    │   │   ├── admin/ImportConfessions.jsx    # Bulk confession import UI
    │   │   └── admin/AnalyticsDashboard.jsx   # Sentiment & aspect analytics
    │   ├── components/          # Reusable UI components & charts
    │   ├── services/            # Axios API service layer
    │   └── utils/               # Helpers
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) for LLM-powered summaries
- A HuggingFace token (`HF_TOKEN`) if using gated models

### Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
LLM_API_KEY=your_groq_api_key_here
HF_TOKEN=your_huggingface_token_here
```

---

## Running the Application

### 1. Backend

From the **project root**, activate your virtual environment, then run:

```bash
uvicorn backend.app.main:app --reload
```

The API will be available at `http://localhost:8000`.

> On first startup, database tables are auto-created and ML models are downloaded/loaded. This may take a moment.

### 2. Frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

> The Vite dev server proxies all `/api` requests to `http://localhost:8000`, so both servers must be running simultaneously.

---

## Default Credentials

| Field | Value |
|---|---|
| **Username** | `superadmin` |
| **Password** | `SuperAdmin123!` |
| **Role** | `superadmin` |

---

## How It Works

### 1. Import Confessions
Admins navigate to **Admin → Import Confessions** and paste or upload a JSON array of student confessions. Each item should follow this shape:

```json
[
  {
    "content": "The midterm schedule was brutal, barely had time to sleep.",
    "source": "scraped",
    "post_date": "2026-05-01T10:00:00Z"
  }
]
```

### 2. Automatic Analysis
Once imported, each confession is processed in the background:

- **Sentiment Analysis** — DistilBERT classifies each confession as positive or negative with a confidence score
- **Aspect-Based Sentiment Analysis (ABSA)** — SentenceTransformer embeddings + KeyBERT map each confession to one or more of 8 campus aspects
- **Vibe Snapshot** — a composite vibe score is computed and stored after every import batch

### 3. Analytics Dashboard
Admins view aggregated results at **Admin → Analytics**, including:

- Overall sentiment distribution (positive / neutral / negative)
- Vibe score trends over time
- Per-aspect breakdown with mention counts and sentiment scores
- Risk signals and trend direction (improving / stable / declining)

---

## Campus Aspects Tracked

| Aspect | What It Covers |
|---|---|
| **Academic Stress** | Exams, workload, grades, deadlines, thesis |
| **Faculty Behavior** | Teaching quality, attitude, guidance, fairness |
| **Administration** | Registrar, enrollment, billing, portals, waiting lines |
| **Campus Facilities** | Classrooms, labs, restrooms, aircon, parking |
| **Student Politics** | SSG, student council, elections, campus events |
| **Student Mental Health** | Counseling, anxiety, burnout, support |
| **Tuition & Costs** | Fees, scholarships, affordability, payments |
| **Transit & Services** | Shuttle, canteen, food, commute |

---

## API Overview

| Prefix | Description |
|---|---|
| `/api/auth` | Login |
| `/api/users` | User management |
| `/api/confessions` | Confession ingestion and listing |
| `/api/analytics` | Aggregated sentiment & aspect analytics |
| `/api/vibe-snapshots` | Periodic vibe score history |
| `/api/dashboard` | Dashboard summary data |

Interactive API docs: `http://localhost:8000/docs`

---

## User Roles

| Role | Access |
|---|---|
| `superadmin` | Full access — import, analytics, user management |
| `admin` | Import confessions, view analytics |

---

## Utility Scripts

Located in `backend/app/scripts/`. Run from the project root:

```bash
python -m backend.app.scripts.<script_name>
```

| Script | Purpose |
|---|---|
| `seed_confessions.py` | Seed sample confession data |
| `clear_db.py` | Wipe all database records |
| `inspect_db.py` | Inspect current database contents |
| `reset_superadmin_password.py` | Reset the superadmin password |
| `backfill_snapshots.py` | Backfill historical vibe snapshots |
| `fetch_analytics.py` | Print analytics output to console |
