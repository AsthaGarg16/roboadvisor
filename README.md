# RoboAdvisor — BMD5302 Financial Modeling
## Group Project · AY 2025/26 Semester 2

---

## Project Structure

```
robo_advisor/
├── backend/
│   ├── app.py              ← Flask API server
│   ├── requirements.txt    ← Python dependencies
│   └── data/               ← PUT YOUR 10 EXCEL FILES HERE
│       └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── QuestionnairePage.jsx
│   │   │   └── PortfolioPage.jsx
│   │   └── components/
│   │       └── ResultDashboard.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md               ← this file
```

---

## Prerequisites

| Tool    | Minimum version | Check with          |
|---------|-----------------|---------------------|
| Python  | 3.11            | `python --version`  |
| Node.js | 18              | `node --version`    |
| npm     | 9               | `npm --version`     |

---

## Step 1 — Add Your Fund Data

Copy your 10 Excel files into `backend/data/`.  
Each file must have **Date in column 0** and **Price in column 1**:

```
backend/data/
  Fund_A.xlsx
  Fund_B.xlsx
  ... (10 files total)
```

The filename (without `.xlsx`) becomes the fund name shown in the UI.

> If your columns are in different positions, edit `DATE_COL` and `PRICE_COL`
> at the top of `backend/app.py`.

---

## Step 2 — Run the Flask Backend

Open **Terminal 1**:

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv

# macOS / Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

You should see:
```
  ╔══════════════════════════════════════════╗
  ║  RoboAdvisor Flask API  →  port 5000     ║
  ╚══════════════════════════════════════════╝
```

Flask runs at **http://localhost:5000**

---

## Step 3 — Run the React Frontend

Open **Terminal 2**:

```bash
cd frontend

# Install Node dependencies (first time only — takes ~30 seconds)
npm install

# Start the dev server
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. ✅

---

## Verify it's working

1. Go to **http://localhost:5173** — you should see the Overview page
2. Click **Frontier & Analytics** — charts should load (requires Excel files in `data/`)
3. Click **Risk Profile** — complete the 8-question assessment
4. After submitting, you'll see the full dashboard: gauge, goal planner, donut chart, fund table, frontier chart, and PDF download

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/questions` | Returns the 8 questionnaire questions |
| POST | `/api/score` | Accepts answers, returns risk aversion A and profile |
| GET | `/api/portfolio` | Returns frontier, GMVP, fund stats, correlation matrix |

### Test with curl

```bash
# Questions
curl http://localhost:5000/api/questions

# Score (option index is 0-based)
curl -X POST http://localhost:5000/api/score \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":0,"q2":1,"q3":0,"q4":2,"q5":0,"q6":1,"q7":0,"q8":1}}'

# Portfolio (requires Excel files in data/)
curl http://localhost:5000/api/portfolio
```

---

## Risk Aversion Formula

Each answer carries a score from 1 (aggressive) to 5 (conservative).
Questions are weighted by importance:

| Question | Topic | Weight |
|----------|-------|--------|
| Q1 | Investment goal | 2.0× |
| Q2 | Reaction to -25% loss | 2.5× |
| Q3 | Investment horizon | 1.5× |
| Q4 | Portfolio as share of wealth | 1.5× |
| Q5 | Scenario preference | 2.0× |
| Q6 | Market familiarity | 1.0× |
| Q7 | Income stability | 1.5× |
| Q8 | Emergency fund | 1.0× |

```
raw  = Σ (weight_i × score_i)
A    = 1 + 9 × (raw − W_min) / (W_max − W_min)   ∈ [1, 10]
```

The resulting A feeds into the utility function:

```
U = r − (σ² × A) / 2
```

---

## Required Return Colour Coding

| Required Return | Status | Colour |
|----------------|--------|--------|
| < 6% | Achievable | 🟢 Green |
| 6–10% | Challenging | 🟡 Amber |
| 10–20% | High — Review Assumptions | 🔴 Red |
| > 20% | Unrealistic ⚠ | 🔴 Red + warning |

---

## Production Build (optional)

To serve the React app through Flask on a single port:

```bash
cd frontend
npm run build           # creates frontend/dist/

cd ../backend
python app.py           # now serves React at http://localhost:5000
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to Flask server" | Make sure `python app.py` is running in `backend/` |
| Portfolio page shows error | Check that Excel files are in `backend/data/` |
| "No files matching *.xlsx" | Rename files to `.xlsx` or change `PATTERN` in `app.py` |
| Charts don't render | Refresh the page; portfolio data computes on first request (~10s for 10 funds) |
| Port 5000 already in use | `PORT=5001 python app.py` and update `const API` in each `.jsx` file |
| Node not found | Install from https://nodejs.org (LTS version) |

---

## Technologies

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Flask 3 + Flask-CORS |
| Optimisation | SciPy (SLSQP) |
| Data processing | Pandas + NumPy |

---

*BMD5302 Financial Modeling — Group Project — AY 2025/26 Semester 2*
