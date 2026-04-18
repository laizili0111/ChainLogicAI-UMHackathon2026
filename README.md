# ChainLogic AI ⛓️🧠

**An Agentic Supply Chain Decision Engine for Automotive SMEs.**

ChainLogic AI is a closed-loop intelligence system designed to ingest unstructured supply chain disruptions (like supplier emails), query live ERP databases (SQLite), calculate financial trade-offs, and execute the mathematically optimal recovery plan directly back into the master database to prevent the Bullwhip Effect.

---

## 🏗️ Architecture

This project is built using a decoupled, full-stack architecture:
* **Frontend:** React / Next.js (Tailwind CSS, Lucide Icons)
* **Backend:** Python / FastAPI
* **Database:** SQLite (Auto-seeded on startup)
* **AI Engine:** Z.AI GLM (via RAG and Agentic Workflow)

### Project Structure
```text
chainlogic-ai/
│
├── backend/                # Python FastAPI Server & SQLite Database
│   ├── main.py             # Core API logic, routing, and DB execution
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Z.AI API Key goes here
│
├── frontend/               # Next.js React Dashboard
│   ├── src/app/page.tsx    # Main UI and Client-side logic
│   ├── package.json        # Node dependencies
│   └── tailwind.config.ts  # UI Styling configuration
│
└── README.md               
```

🚀 Quick Start Guide
To run this prototype locally, you will need to run the Backend and the Frontend simultaneously in two separate terminal windows.

Prerequisites
Python 3.9+

Node.js 18+

### Terminal 1: Start the AI Backend & Database

Open a terminal and navigate to the backend directory:
cd backend

Create a virtual environment:
Windows: python -m venv venv
Mac/Linux: python3 -m venv venv

Activate the virtual environment:
Windows: .\venv\Scripts\activate
Mac/Linux: source venv/bin/activate

Install the required dependencies:
pip install -r requirements.txt

Start the FastAPI server:
python -m uvicorn main:app --reload
(Note: On the first run, the server will automatically generate and seed the chainlogic_erp.db SQLite database).

### Terminal 2: Start the React Dashboard

Open a new, second terminal window and navigate to the frontend directory:
cd frontend

Install the Node modules (only needed the first time):
npm install

Start the Next.js development server:
npm run dev

Open your browser and navigate to http://localhost:3000 to view the dashboard