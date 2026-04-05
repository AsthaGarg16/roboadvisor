# RoboAdvisor

A web-based robo-advisor that builds a personalised investment portfolio for any investor. The user answers a short questionnaire, receives a risk profile, sets a savings goal, and is shown an optimised portfolio drawn from a universe of funds — complete with an efficient frontier, allocation breakdown, and downloadable PDF report.

---

## What the App Does

From an investor's perspective, the experience has four steps:

1. **Overview** — landing page that explains how the tool works.
2. **Risk Profile** — a 10-question questionnaire that measures both the investor's *willingness* to take risk (attitude, behaviour) and their *capacity* to take risk (income, liquidity, obligations). The system reconciles the two dimensions and assigns a risk aversion score from 1 (aggressive) to 10 (conservative).
3. **Portfolio Recommendation** — given the investor's risk aversion, the app solves for the portfolio that maximises their utility `U = r − (A/2)·σ²`. The investor inputs a target amount and time horizon; the app back-calculates the required annual return and colour-codes whether that target is achievable, challenging, or unrealistic.
4. **Fund Overview** — deep-dive analytics on each individual fund: cumulative return, rolling volatility, Sharpe ratio, and a correlation heatmap to understand diversification.

---

## How the Questionnaire Works

The 10 questions are split into two blocks:

| Block | Questions | What it measures |
|-------|-----------|-----------------|
| **Risk Willingness** (attitude) | Q1–Q5 | Investment goal, portfolio preference, reaction to drawdowns, fear of loss vs. inflation, maximum tolerable loss |
| **Risk Capacity** (financial) | Q6–Q10 | Investment horizon, income stability, liquidity reserves, debt/dependents, goal-timing flexibility |

Each answer carries a raw score on a 1–10 scale (1 = most conservative, 10 = most aggressive). Within each block, scores are averaged:

```
RW = mean of Q1–Q5 scores
RC = mean of Q6–Q10 scores
```

The **final risk score** is `min(RW, RC)` — the binding constraint. Risk aversion is then:

```
A = 11 − final_risk_score          A ∈ [1, 10]
```

The gap between the two blocks also generates an advisory message:

| Delta (RW − RC) | Message |
|-----------------|---------|
| ≥ 2.0 | **Risk Alert** — willingness exceeds capacity; portfolio capped at capacity |
| ≤ −2.0 | **Educational Insight** — capacity exceeds willingness; investor may be too cautious |
| Otherwise | **Risk Profile Aligned** |

Five named profiles map onto the A scale:

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

Daily closing prices for each fund are loaded from Excel files in `backend/data/`. Log-returns are computed and annualised (×252 trading days) to produce a vector of expected returns **μ** and a covariance matrix **Σ**.

### 2. Efficient Frontier

The app traces 120 points along the mean-variance efficient frontier by solving, for each target return *t*:

```
min   w'Σw
 w
s.t.  w'μ = t
      Σwᵢ = 1
      wᵢ ≥ 0  (long-only constraint; a short-selling toggle is also available)
```

The **Global Minimum Variance Portfolio (GMVP)** anchors the left end of the frontier.

### 3. Optimal Portfolio

Given the investor's risk aversion coefficient *A*, the recommended portfolio maximises the mean-variance utility:

```
max   U = w'μ − (A/2) · w'Σw
 w
s.t.  Σwᵢ = 1,  wᵢ ≥ 0
```

This is solved numerically with SciPy SLSQP. The result is a set of fund weights that sits on the efficient frontier at the point of tangency with the investor's indifference curve.

### 4. Goal Planner

The investor enters a current portfolio value *P₀*, a target value *P_T*, and an investment horizon *T* (years). The required annual return is:

```
r_required = (P_T / P₀)^(1/T) − 1
```

This is compared against the optimal portfolio's expected return and colour-coded:

| Required return | Status |
|----------------|--------|
| < 6% | Achievable (green) |
| 6–10% | Challenging (amber) |
| 10–20% | High — review assumptions (red) |
| > 20% | Unrealistic (red + warning) |

---

## Project Structure

```
roboadvisor/
├── backend/               ← Python / Flask API
│   ├── app.py             ← routes, questionnaire logic, risk scoring
│   ├── portfolio_math.py  ← all quantitative finance (returns, frontier, optimiser)
│   ├── fetch_data.py      ← downloads fund price data via yfinance
│   ├── generate_charts.py ← static PNG charts (optional)
│   ├── requirements.txt
│   └── data/              ← Excel price files (one per fund)
│
├── frontend/              ← React / Vite SPA
│   ├── src/
│   │   ├── App.jsx        ← router + side-navigation
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── QuestionnairePage.jsx
│   │   │   ├── PortfolioPage.jsx
│   │   │   └── FundOverviewPage.jsx
│   │   └── components/
│   │       └── ResultDashboard.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── setup.py               ← one-command setup (cross-platform)
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool    | Min version | Check |
|---------|-------------|-------|
| Python  | 3.11        | `python --version` |
| Node.js | 18          | `node --version` |
| npm     | 9           | `npm --version` |

### 1 — Install dependencies

Run the setup script from the repo root. It creates a Python virtual environment under `backend/venv/` and runs `npm install` for the frontend — works on Mac, Linux, and Windows.

```bash
python setup.py
```

### 2 — Get fund data

```bash
cd backend
python fetch_data.py        # downloads price data into ./data/
```

Or copy your own `.xlsx` files into `backend/data/` (column 0 = Date, column 1 = Price).

### 3 — Start the backend

```bash
# Mac / Linux
cd backend && source venv/bin/activate && python app.py

# Windows
cd backend && venv\Scripts\activate && python app.py
```

The API is available at **http://localhost:5000**.

### 4 — Start the frontend

```bash
cd frontend
npm run dev                 # → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Returns the 10 questionnaire questions (scores hidden) |
| POST | `/api/score` | Accepts answers, returns A, profile, willingness/capacity split |
| GET | `/api/portfolio` | Frontier, GMVP, fund stats, correlation matrix |
| GET | `/api/optimal?A=<value>` | Optimal weights for a given risk aversion *A* |
| GET | `/api/fund-overview` | Per-fund stats + cumulative return + rolling volatility series |

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
| Data download | yfinance |

---

*BMD5302 Financial Modeling — Group Project — AY 2025/26 Semester 2*
