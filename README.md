# ChainLogic AI ⛓️🧠

**A Zero-Setup, Agentic ERP Operating System powered by AI.**

ChainLogic AI is a composable, Jupyter-style operational ledger that dynamically architects its own database schema from plain-language business descriptions. Instead of forcing the user to adapt to a rigid database, the AI adapts the database to fit the user — any industry, any scale, zero configuration.

---

## ✨ Key Features

- **Zero-Setup ERP** — Describe your business in plain English. Z.AI dynamically builds a generalized Entity-Attribute-Value (EAV) SQLite schema on-the-fly.
- **Jupyter-Style Notebook Canvas** — Sequential, infinite-scroll ledger of operational log cells. Each cell captures a note, runs AI reasoning, and produces a structured output plan.
- **Continuous Memory** — Z.AI reads every previous cell as cumulative context when reasoning about the newest entry, maintaining full operational continuity across the working day.
- **Composable Plugin Context** — Drag-and-drop modifier cards (Live Weather, Traffic, Human Override, Routing Map) directly into any cell to enrich AI context dynamically.
- **Human-in-the-Loop Override** — A dedicated plugin card lets the operator inject manual instructions that override AI constraints for the current cell.
- **Z.AI Optimal Decision Ranking** — Action cards are semantically ranked. The model marks exactly one option as `recommended: true`, visually highlighted for rapid execution.
- **Git-Like Operations Timeline** — A left-hand navigation tree shows all committed cells as nodes. Click any node to instantly scroll the canvas to that snapshot.
- **Business Context Editor** — A persistent header button lets operators view and re-initialize the ERP schema at any time without losing their current log session.

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| **Frontend** | Next.js App Router, Zustand, Tiptap, @dnd-kit |
| **Backend** | Python, FastAPI, SQLite (EAV pattern) |
| **AI Engine** | Groq (llama-3.3-70b-versatile) via OpenAI-compatible API |
| **Design** | Vanilla CSS + Tailwind — "Dark Espresso" aesthetic |

### Project Structure
```text
ChainLogicAI/
│
├── backend/
│   ├── main.py             # FastAPI server — ERP init, ledger plan generation, decision execution
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # API Keys (NOT committed to git)
│   └── .gitignore
│
├── frontend/
│   ├── src/app/page.tsx    # Main Jupyter-style UI and all client-side logic
│   ├── src/store/          # Zustand state — LedgerCell[] per day tab
│   ├── src/components/     # LogisticsMap, AnimatedTruckEdge, etc.
│   └── package.json
│
└── README.md
```

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` folder. It is safely ignored by Git.

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key (30 RPM free tier) at: https://console.groq.com

> Optionally, you can also use the Google Gemini API by switching `base_url` in `main.py` to `https://generativelanguage.googleapis.com/v1beta/openai/` and setting `GEMINI_API_KEY`.

---

## 🚀 Quick Start

You need two terminals running simultaneously.

### Terminal 1 — Python Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### Terminal 2 — Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## 🧪 How to Demo

1. Open `http://localhost:3000` in your browser.
2. On the **Zero-Setup ERP** initialization screen, describe your business in plain English:
   > *"I am a freelance UI designer. I track active corporate projects, an hourly billing rate of $100/hr, and maintain strict deployment SLAs."*
3. Click **Initialize Universal Schema**. Z.AI will build your ERP entity database in seconds.
4. In the Jupyter canvas, type your first operational log entry in the `In[1]` composer and hit **Commit Cell & Run Z.AI**.
5. Review the structured output — metrics, alerts, and ranked action cards with a `⭐ Z.AI Optimal` recommendation.
6. Drag modifier plugins (🌧️ Weather, 🚦 Traffic, 📝 Human Override) into the drop zone to enrich the AI context before committing the next cell.
7. Repeat for subsequent cells. Z.AI automatically reads all previous entries as cumulative context.

### Example Scenarios

| Business Type | Initialization Prompt |
|---|---|
| **Freelance Developer** | *"I am an independent software developer. I manage multiple active client contracts, strictly track my hourly billing rate at RM 150/hr, and oversee software maintenance SLAs."* |
| **Nasi Lemak Seller** | *"I run a small nasi lemak stall near a university. I prepare 150 packets daily for local university cafes. Raw ingredients include fresh chicken, rice, and sambal, and I operate 6 days a week."* |
| **Delivery Company** | *"I manage a last-mile delivery company with 5 delivery vans. I track daily route performance, driver shift SLAs, fuel costs, and package delivery success rates."* |