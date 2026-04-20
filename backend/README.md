# Backend

Python / Flask REST API — serves questionnaire data, scores risk profiles, and performs all portfolio mathematics.

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
├── app.py              ← Flask routes, questionnaire, risk scoring
├── portfolio_math.py   ← returns, covariance, frontier, SLSQP optimiser
├── fetch_data.py       ← downloads price history via yfinance
├── generate_charts.py  ← static PNG charts (optional, not required by the web app)
├── requirements.txt
└── data/               ← Excel price files (.xlsx), one per fund
```

### File responsibilities

| File | Responsibility |
|------|---------------|
| `app.py` | All Flask routes. Contains questions, per-answer scores, risk profile thresholds, and `compute_risk_aversion()`. No portfolio maths. |
| `portfolio_math.py` | Loads prices, computes log-returns, annualises μ and Σ, solves GMVP, traces the efficient frontier, solves the optimal portfolio for a given *A*, produces fund-overview statistics. |
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

### `GET /api/fund-overview`

Per-fund stats (return, std dev, variance, Sharpe), covariance and correlation matrices, monthly cumulative return series, 30-day rolling volatility series.

---

## Portfolio Mathematics

Log-returns annualised over 252 trading days:

```
μ = mean(log(Pₜ/Pₜ₋₁)) × 252
Σ = cov(log(Pₜ/Pₜ₋₁))  × 252
```

Optimal portfolio for risk aversion *A*:

```
max   w'μ − (A/2) · w'Σw
 w
s.t.  Σwᵢ = 1,  wᵢ ≥ 0
```

Solved with `scipy.optimize.minimize` (SLSQP).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FileNotFoundError: No files matching *.xlsx` | Run `python fetch_data.py` or add Excel files to `data/` |
| `ModuleNotFoundError` | Activate the venv and re-run `pip install -r requirements.txt` |
| Port 5001 in use | Change the port in `app.py` and update the `API` constant in each `.jsx` page file |
| Slow first portfolio load | Normal — frontier computation runs once then is cached in memory |
