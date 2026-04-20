# RoboAdvisor

A web-based robo-advisor that builds a personalised investment portfolio for any investor. The user answers a short questionnaire, receives a risk profile, sets savings goals, and is shown an optimised portfolio drawn from a universe of funds — complete with an efficient frontier, allocation breakdown, covariance/correlation heatmaps, and a downloadable PDF report.

---

## Quick Start

### Prerequisites

| Tool    | Min version | Check |
|---------|-------------|-------|
| Python  | 3.11        | `python --version` |
| Node.js | 18          | `node --version` |
| npm     | 9           | `npm --version` |

### 1 — Install dependencies

Run the setup script from the repo root. It creates a Python virtual environment under `backend/venv/` and installs all frontend packages.

```bash
python setup.py
```

### 2 — Get fund data

```bash
cd backend
python fetch_data.py        # downloads price history into ./data/
```

Or drop your own `.xlsx` files into `backend/data/` (column 0 = Date, column 1 = Adjusted Close Price).

### 3 — Start the backend

```bash
# Mac / Linux
cd backend && source venv/bin/activate && python app.py

# Windows
cd backend && venv\Scripts\activate && python app.py
```

Flask API available at **http://localhost:5001**.

### 4 — Start the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## What the App Does

The sidebar has five sections:

| Tab | Description |
|-----|-------------|
| **Overview** | Landing page explaining how the tool works |
| **Risk Profile** | 10-question questionnaire → risk aversion score + profile |
| **My Portfolio** | Your most recent portfolio recommendation, cached across navigation (clears on refresh) |
| **Frontier & Analytics** | Live efficient frontier, GMVP, correlation heatmap, fund scatter |
| **Fund Overview** | Per-fund deep-dive: cumulative return, rolling volatility, Sharpe ratio, covariance matrix |

---

## How the Questionnaire Works

Ten questions split into two blocks:

| Block | Questions | What it measures |
|-------|-----------|-----------------|
| **Risk Willingness** | Q1–Q5 | Investment goal, portfolio preference, reaction to drawdowns, fear of loss vs. inflation, max tolerable loss |
| **Risk Capacity** | Q6–Q10 | Investment horizon, income stability, liquidity reserves, debt/dependents, goal-timing flexibility |

Each answer scores 1–10 (1 = most conservative, 10 = most aggressive). Block averages are computed:

```
RW = mean(Q1–Q5)
RC = mean(Q6–Q10)
final_score = min(RW, RC)      ← binding constraint
A = 11 − final_score           ← risk aversion, A ∈ [1, 10]
```

The gap between blocks generates an advisory message:

| Delta (RW − RC) | Message |
|-----------------|---------|
| ≥ 2.0 | Risk Alert — willingness exceeds capacity |
| ≤ −2.0 | Educational Insight — capacity exceeds willingness |
| Otherwise | Risk Profile Aligned |

Risk profiles by A:

| A range | Profile |
|---------|---------|
| ≤ 2 | Aggressive |
| ≤ 4 | Moderately Aggressive |
| ≤ 6 | Balanced |
| ≤ 8 | Moderately Conservative |
| ≤ 10 | Conservative |

---

## How the Portfolio is Calculated

### 1. Data

Daily closing prices are loaded from `backend/data/`. Log-returns are computed and annualised (×252 trading days) to produce expected returns **μ** and covariance matrix **Σ**.

### 2. Efficient Frontier

120 points traced by solving, for each target return *t*:

```
min   w'Σw
 w
s.t.  w'μ = t,   Σwᵢ = 1,   wᵢ ≥ 0
```

A short-selling toggle removes the non-negativity constraint. The **GMVP** anchors the left end.

### 3. Optimal Portfolio

Maximises mean-variance utility for the investor's risk aversion *A*:

```
max   U = w'μ − (A/2) · w'Σw
 w
s.t.  Σwᵢ = 1,   wᵢ ≥ 0
```

Solved with SciPy SLSQP. The result sits on the efficient frontier at the tangency point with the investor's indifference curve.

### 4. Goal Planner

Given investable capital *P₀*, target value *P_T*, and horizon *T* years:

```
r_required = (P_T / P₀)^(1/T) − 1
```

Colour-coded against the portfolio's expected return:

| Required return | Status |
|----------------|--------|
| < 6% | Achievable |
| 6–10% | Challenging |
| 10–20% | High — review assumptions |
| > 20% | Unrealistic |

---

## Project Structure

```
roboadvisor/
├── backend/
│   ├── app.py               ← Flask API, questionnaire logic, risk scoring
│   ├── portfolio_math.py    ← returns, covariance, frontier, SLSQP optimiser
│   ├── fetch_data.py        ← downloads fund price data via yfinance
│   ├── generate_charts.py   ← static PNG charts (optional)
│   ├── requirements.txt
│   └── data/                ← Excel price files (one per fund)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← router, side-navigation, theme toggle
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── QuestionnairePage.jsx
│   │   │   ├── MyPortfolioPage.jsx  ← cached assessment result
│   │   │   ├── PortfolioPage.jsx
│   │   │   └── FundOverviewPage.jsx
│   │   └── components/
│   │       └── ResultDashboard.jsx  ← full results UI (charts, tables, PDF export)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── setup.py                 ← one-command setup (cross-platform)
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Returns the 10 questionnaire questions |
| POST | `/api/score` | Accepts answers, returns A, profile, willingness/capacity breakdown |
| GET | `/api/portfolio` | Frontier points, GMVP, fund stats, correlation matrix |
| GET | `/api/optimal?A=<value>` | Optimal weights for a given risk aversion *A* |
| GET | `/api/fund-overview` | Per-fund stats, cumulative returns, rolling volatility series |

---

## Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Flask 3 + Flask-CORS |
| Optimisation | SciPy (SLSQP) |
| Data processing | Pandas + NumPy |
| Data download | yfinance |

---

*BMD5302 Financial Modeling — Group Project — AY 2025/26 Semester 2*
