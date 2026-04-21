# Backend

Python / Flask REST API — serves questionnaire data, scores risk profiles, and performs all portfolio mathematics and simulation.

Runs on **http://localhost:5001**.

## Local Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download fund price data
python fetch_data.py            # writes one .xlsx per fund into ./data/

# Start the server
python app.py
```

---

## Directory Structure

```
backend/
├── app.py                  ← Flask routes, questionnaire, risk scoring
├── portfolio_optimizer.py  ← pure maths: statistics, GMVP, frontier, SLSQP optimisers
├── portfolio_data.py       ← data loading, Monte Carlo simulation, caching, aggregated getters
├── fetch_data.py           ← downloads price history via yfinance
├── generate_charts.py      ← static PNG charts (optional, not required by the web app)
├── requirements.txt
└── data/                   ← Excel price files (.xlsx), one per fund
```

### File responsibilities

| File | Responsibility |
|------|---------------|
| `app.py` | All Flask routes. Contains questions, per-answer scores, risk profile thresholds, and `compute_risk_aversion()`. No portfolio maths. Imports from `portfolio_optimizer` and `portfolio_data`. |
| `portfolio_optimizer.py` | Pure portfolio mathematics — no I/O, no caching. Computes log-return statistics (μ, Σ), solves the GMVP (long-only and short-allowed), traces the efficient frontier with warm-started SLSQP sweeps, and finds utility-maximising or target-return optimal portfolios. |
| `portfolio_data.py` | Data loading, Monte Carlo simulation, in-process caching, and aggregated response builders. Depends on `portfolio_optimizer` for all mathematical calls. |
| `fetch_data.py` | Run once to populate `data/`. Downloads daily closing prices for a predefined ticker list and writes one `.xlsx` per fund. |
| `generate_charts.py` | Renders static PNG charts offline. Not needed for the web app. |

---

## API Endpoints

### `GET /api/questions`

Returns the 10 questionnaire questions. Answer scores are not exposed.

```json
{
  "questions": [
    { "id": "q1", "text": "...", "options": ["...", "..."] }
  ]
}
```

### `POST /api/score`

Accepts 0-based answer indices, returns risk aversion, profile, and willingness/capacity breakdown.

**Request:**
```json
{ "answers": { "q1": 2, "q2": 3, "q3": 2, "q4": 1, "q5": 2, "q6": 3, "q7": 2, "q8": 2, "q9": 2, "q10": 1 } }
```

**Response:**
```json
{
  "risk_aversion": 3.5,
  "profile": "Moderately Aggressive",
  "colour": "#e67e22",
  "description": "...",
  "utility_formula": "U = r - (σ² × 3.5) / 2",
  "risk_willingness": 7.4,
  "risk_capability": 7.6,
  "final_risk_score": 7.4,
  "delta": -0.2,
  "assessment": "Risk Profile Aligned",
  "explanation": "..."
}
```

### `GET /api/portfolio`

Efficient frontier, GMVP (with and without short-selling), per-fund annualised returns, standard deviations, and correlation matrix. Cached in memory after the first call.

### `GET /api/optimal?A=<float>&short=<bool>`

Optimal portfolio weights, expected return, std dev, Sharpe ratio, and utility for the given risk aversion *A*.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `A` | 5.0 | Risk aversion (1–10) |
| `short` | false | Allow short-selling |

### `GET /api/optimal_for_return?target_return=<float>&short=<bool>`

Minimum-variance portfolio targeting a specific expected return (used by the Goal Planner).

| Parameter | Default | Description |
|-----------|---------|-------------|
| `target_return` | 0.07 | Required annualised return |
| `short` | false | Allow short-selling |

### `GET /api/monte-carlo?A=<float>&short=<bool>&n_sims=<int>&initial_investment=<float>`

Monte Carlo simulation of portfolio wealth paths over 252 trading days (2026). Uses Cholesky-decomposed correlated daily log-returns.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `A` | 5.0 | Risk aversion — determines the optimal portfolio to simulate |
| `short` | false | Allow short-selling |
| `n_sims` | 2000 | Number of simulation paths (capped at 5000) |
| `initial_investment` | 10000 | Starting capital in dollars |

**Response includes:**
- `percentile_paths` — p5/p10/p25/p50/p75/p90/p95 wealth values subsampled every 5 days
- `histogram` — 40-bin distribution of final portfolio values
- `stats` — mean, median, std, VaR 95%, CVaR 95%, probability of profit, max drawdown on the median path
- `portfolio` — underlying portfolio's annualised return, σ, and Sharpe ratio

### `GET /api/fund-overview`

Per-fund stats (return, std dev, variance, Sharpe), covariance and correlation matrices, monthly cumulative return series, 30-day rolling volatility series.

---

## Portfolio Mathematics

### Statistics

Log-returns annualised over 252 trading days:

```
μ = mean(log(Pₜ/Pₜ₋₁)) × 252
Σ = cov(log(Pₜ/Pₜ₋₁))  × 252
```

### Optimal portfolio

```
max   w'μ − (A/2) · w'Σw
 w
s.t.  Σwᵢ = 1,  wᵢ ≥ 0
```

Solved with `scipy.optimize.minimize` (SLSQP).

### Monte Carlo simulation

Each path draws correlated daily log-returns via Cholesky decomposition:

```
L  = cholesky(Σ / 252)
rₜ = μ/252 + L · zₜ,    zₜ ~ N(0, I)
Wₜ = W₀ · exp(Σ w'rₜ)
```

2000 paths × 252 days by default. Returns percentile fan-chart data and key risk statistics (VaR, CVaR, probability of profit, max drawdown).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FileNotFoundError: No files matching *.xlsx` | Run `python fetch_data.py` or add Excel files to `data/` |
| `ModuleNotFoundError` | Activate the venv and re-run `pip install -r requirements.txt` |
| Port 5001 in use | Change the port in `app.py` and update the `API` constant in each `.jsx` page file |
| Slow first portfolio load | Normal — frontier computation runs once then is cached in memory |
| Monte Carlo endpoint slow | Reduce `n_sims` query param (default 2000; min 100) |
