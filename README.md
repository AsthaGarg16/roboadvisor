# RoboAdvisor

A full-stack robo-advisor that takes an investor through a risk questionnaire, builds a personalised mean-variance optimal portfolio, runs Monte Carlo simulations for 2026, and visualises the efficient frontier, covariance structure, and fund analytics — all in a browser.

**Demo Video:** https://youtu.be/SO_d2Zvie9s
**Deployed WebApp:** https://roboadvisor-two.vercel.app/

> **Note:** The app is deployed on free-tier infrastructure (Vercel + Railway). The backend may take up to 30 seconds to respond on the first request after a period of inactivity.

---

## Assessment Coverage

| Part                                           | Marks | What was built                                                                                                                                      |
| ---------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Part 1 — Efficient Frontier**                | 30    | 10-fund universe selected via correlation analysis (`analysis/`); annualised μ and Σ; frontier traced with and without short sales; GMVP identified |
| **Part 2 — Risk Aversion & Optimal Portfolio** | 30    | 10-question psychometric questionnaire → risk aversion _A_; SLSQP utility maximisation `U = w′μ − (A/2)·w′Σw`                                       |
| **Part 3 — Platform**                          | 20    | React + Flask web app with five pages, interactive charts, Monte Carlo simulation, goal planner, and PDF export                                     |
| **Part 4 — Video**                             | 20    | 15-minute walkthrough and live demo                                                                                                                 |

### Rubric alignment

| Rubric category        | How this project addresses it                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Financial Modeling** | Covariance matrix computed from 3 years of daily log-returns; frontier plotted with 120 sampled points; GMVP and optimal portfolio annotated       |
| **Risk Assessment**    | Two-block questionnaire (Risk Willingness Q1–Q5 / Risk Capacity Q6–Q10); binding-constraint scoring; advisory alert when blocks diverge by ≥ 2     |
| **Platform Design**    | Single-page React app with sidebar navigation, dark/light theme, session-persistent portfolio, Monte Carlo fan charts, and downloadable PDF report |
| **Presentation**       | Live interactive demo; all charts, formulas, and fund-selection rationale documented below                                                         |

---

## Quick Start (local)

### Prerequisites

| Tool    | Min version | Check              |
| ------- | ----------- | ------------------ |
| Python  | 3.11        | `python --version` |
| Node.js | 18          | `node --version`   |
| npm     | 9           | `npm --version`    |

### 1 — Install dependencies

```bash
python setup.py
```

Creates `venv/` and installs all Python and Node packages.

### 2 — Get fund data

```bash
cd analysis
python3 fetch_data.py        # downloads price history into ../data/
```

Or drop your own `.xlsx` files into `data/` (column 0 = Date, column 1 = Adjusted Close Price).

### 3 — Start the backend

```bash
# Mac / Linux
cd backend && source ../venv/bin/activate && python app.py

# Windows
cd backend && ..\venv\Scripts\activate && python app.py
```

Flask API available at **http://localhost:5001**.

### 4 — Start the frontend

```bash
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Part 1 — Efficient Frontier

### Fund selection (25 → 10)

Starting from a 25-ETF universe spanning US sectors, international equities, fixed income, and alternatives, the script in `analysis/funds_analysis.py` iteratively removes the fund with the highest average pairwise correlation until 10 diversified funds remain. Three charts document the selection:

| Chart                                   | File                                           |
| --------------------------------------- | ---------------------------------------------- |
| Correlation heatmap — all 25 candidates | `analysis/1_initial_correlation_research.png`  |
| Correlation heatmap — final 10          | `analysis/2_final_diversified_correlation.png` |
| Annualised risk-return scatter          | `analysis/3_risk_return_landscape.png`         |

See [`analysis/README.md`](analysis/README.md) for full details.

### Statistical analysis

Daily closing prices are loaded from `data/` at the project root. Log-returns are computed and annualised (×252 trading days) to produce:

- **μ** — vector of expected annual returns
- **Σ** — variance-covariance matrix

### Efficient frontier

120 points traced by solving, for each target return _t_:

```
min   w′Σw
 w
s.t.  w′μ = t,   Σwᵢ = 1,   wᵢ ≥ 0   (long-only)
```

A short-selling toggle removes the non-negativity constraint. The **GMVP** anchors the left end of both curves.

---

## Part 2 — Risk Aversion & Optimal Portfolio

### Questionnaire design

Ten questions split into two blocks:

| Block                | Questions | What it measures                                                                                             |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| **Risk Willingness** | Q1–Q5     | Investment goal, portfolio preference, reaction to drawdowns, fear of loss vs. inflation, max tolerable loss |
| **Risk Capacity**    | Q6–Q10    | Investment horizon, income stability, liquidity reserves, debt/dependents, goal-timing flexibility           |

Each answer scores 1–10 (1 = most conservative, 10 = most aggressive).

### Scoring

```
RW = mean(Q1–Q5)
RC = mean(Q6–Q10)
final_score = (RW + RC) / 2
A = 11 − final_score           ← risk aversion A ∈ [1, 10]
```

The gap between blocks generates an advisory message:

| Delta (RW − RC) | Message                                            |
| --------------- | -------------------------------------------------- |
| ≥ 2.0           | Risk Alert — willingness exceeds capacity          |
| ≤ −2.0          | Educational Insight — capacity exceeds willingness |
| Otherwise       | Risk Profile Aligned                               |

Risk profiles by _A_:

| A    | Profile                 |
| ---- | ----------------------- |
| ≤ 2  | Aggressive              |
| ≤ 4  | Moderately Aggressive   |
| ≤ 6  | Balanced                |
| ≤ 8  | Moderately Conservative |
| ≤ 10 | Conservative            |

### Optimal portfolio

Maximises mean-variance utility using the investor's _A_:

```
U = w′μ − (A/2) · w′Σw

max U   s.t.  Σwᵢ = 1,   wᵢ ≥ 0
 w
```

Solved with SciPy SLSQP. The result sits on the efficient frontier at the tangency point with the investor's indifference curve.

### Monte Carlo simulation

2000 correlated wealth paths are simulated over 252 trading days using Cholesky decomposition:

```
L  = cholesky(Σ / 252)
rₜ = μ/252 + L · zₜ,    zₜ ~ N(0, I)
Wₜ = W₀ · exp(Σ w′rₜ)
```

The simulation returns percentile fan-chart data (p5–p95), a distribution histogram of final values, and key risk metrics: VaR 95%, CVaR 95%, probability of profit, and max drawdown on the median path.

### Goal planner

Given investable capital _P₀_, target value _P_T_, and horizon _T_ years:

```
r_required = (P_T / P₀)^(1/T) − 1
```

Colour-coded against the portfolio's expected return:

| Required return         | Status                    |
| ----------------------- | ------------------------- |
| ≤ portfolio return      | Achievable                |
| ≤ 1.2× portfolio return | Challenging               |
| ≤ 1.5× portfolio return | High — review assumptions |
| > 1.5× portfolio return | Unrealistic               |

---

## Part 3 — Platform

### App pages

| Page                     | Description                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Overview**             | Landing page explaining the tool and methodology                                     |
| **Risk Profile**         | 10-question questionnaire → risk score + profile                                     |
| **My Portfolio**         | Most recent portfolio recommendation with Monte Carlo simulation, session-persistent |
| **Frontier & Analytics** | Live efficient frontier, GMVP, correlation heatmap, fund scatter                     |
| **Fund Overview**        | Per-fund: cumulative return, rolling volatility, Sharpe ratio, covariance matrix     |

### API endpoints

| Method | Endpoint                                        | Description                                                      |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/questions`                                | Returns the 10 questionnaire questions                           |
| POST   | `/api/score`                                    | Accepts answers → A, profile, willingness/capacity scores        |
| GET    | `/api/portfolio`                                | Frontier points, GMVP, fund stats, correlation matrix            |
| GET    | `/api/optimal?A=<value>`                        | Optimal weights for a given _A_                                  |
| GET    | `/api/optimal_for_return?target_return=<value>` | Min-variance portfolio for a target return (goal planner)        |
| GET    | `/api/monte-carlo?A=<value>`                    | Monte Carlo simulation — percentile paths, histogram, risk stats |
| GET    | `/api/fund-overview`                            | Per-fund stats, cumulative returns, rolling volatility series    |

---

## Project Structure

```
roboadvisor/
├── data/                       ← Excel price files (one per fund)
│
├── analysis/
│   ├── funds_analysis.py       ← 25 → 10 fund selection via greedy correlation pruning
│   ├── fetch_data.py           ← downloads fund price data into ../data/
│   ├── generate_charts.py      ← static PNG report charts
│   └── *.png                   ← selection research charts
│
├── backend/
│   ├── app.py                  ← Flask API, questionnaire logic, risk scoring
│   ├── portfolio_optimizer.py  ← pure maths: statistics, GMVP, frontier, SLSQP optimisers
│   └── portfolio_data.py       ← data loading, Monte Carlo simulation, caching
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── QuestionnairePage.jsx
│   │   │   ├── MyPortfolioPage.jsx
│   │   │   ├── PortfolioPage.jsx
│   │   │   └── FundOverviewPage.jsx
│   │   └── components/
│   │       └── ResultDashboard.jsx
│   ├── vercel.json             ← Vercel SPA routing config
│   └── vite.config.js
│
├── requirements.txt            ← Python dependencies (used by Railway)
├── railway.toml                ← Railway deployment config
├── setup.py                    ← one-command local setup
└── README.md
```

---

## Technologies

| Layer           | Technology                                                            |
| --------------- | --------------------------------------------------------------------- |
| Frontend        | React 19 + Vite 6                                                     |
| Routing         | React Router v7                                                       |
| Charts          | Recharts (ScatterChart, ComposedChart, AreaChart, BarChart, PieChart) |
| Icons           | Lucide React                                                          |
| Backend         | Flask 3 + Flask-CORS                                                  |
| Optimisation    | SciPy (SLSQP)                                                         |
| Simulation      | NumPy (Cholesky Monte Carlo)                                          |
| Data processing | Pandas + NumPy                                                        |
| Hosting         | Vercel (frontend) + Railway (backend)                                 |
