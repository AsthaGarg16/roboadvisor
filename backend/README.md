# Backend

Python / Flask REST API that serves questionnaire data, scores risk profiles, and performs all portfolio mathematics.

---

## Directory Structure

```
backend/
├── app.py             ← Flask application: routes + questionnaire + risk scoring
├── portfolio_math.py  ← Quantitative finance: returns, covariance, frontier, optimiser
├── fetch_data.py      ← Downloads fund price history from Yahoo Finance (yfinance)
├── generate_charts.py ← Generates static PNG charts (optional, for offline use)
├── requirements.txt   ← Python dependencies
└── data/              ← Excel price files, one per fund (.xlsx)
    └── README.md
```

### File responsibilities

| File | Responsibility |
|------|---------------|
| `app.py` | Defines all Flask routes. Contains the questionnaire questions, per-answer scores, risk profile thresholds, and the `compute_risk_aversion()` function. Does not contain any maths beyond risk scoring. |
| `portfolio_math.py` | All quantitative work: loading prices, computing log-returns, annualising μ and Σ, solving the GMVP, tracing the efficient frontier, solving the optimal portfolio for a given *A*, and producing fund-overview statistics. |
| `fetch_data.py` | Run once to populate `data/`. Downloads daily closing prices for a predefined list of tickers via yfinance and writes one `.xlsx` file per fund. |
| `generate_charts.py` | Optional script that renders static PNG charts (correlation heatmap, frontier plot). Not required for the web app. |

---

## Local Setup

### 1. Prerequisites

- Python 3.11 or later
- (Recommended) a virtual environment

### 2. Create and activate a virtual environment

```bash
cd backend

python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Key packages:

| Package | Purpose |
|---------|---------|
| `flask` + `flask-cors` | HTTP server and cross-origin support for the React dev server |
| `pandas` + `numpy` | Data loading, log-return computation, matrix operations |
| `scipy` | SLSQP optimiser for frontier and optimal portfolio |
| `openpyxl` / `xlrd` | Reading `.xlsx` / `.xls` price files |
| `yfinance` | Downloading historical price data (fetch_data.py) |
| `matplotlib` + `seaborn` | Static chart generation (generate_charts.py) |

### 4. Add fund data

```bash
python fetch_data.py       # auto-downloads to ./data/
```

Or manually copy `.xlsx` files into `backend/data/`. Each file must have:
- **Column 0** — Date
- **Column 1** — Price (daily closing / NAV)

The filename (without `.xlsx`) becomes the fund label in the UI.

### 5. Start the server

```bash
python app.py
```

The API runs at **http://localhost:5000**.

To use a different port:

```bash
PORT=5001 python app.py
```

---

## API Endpoints

### `GET /api/questions`

Returns the 10 questionnaire questions with their answer labels. Answer scores are **not** exposed.

```json
{
  "questions": [
    {
      "id": "q1",
      "text": "What is your primary investment goal?",
      "options": ["Preservation: ...", "Income: ...", "Growth: ...", "Aggressive Growth: ..."]
    },
    ...
  ]
}
```

---

### `POST /api/score`

Accepts the investor's selected option index (0-based) for each question. Returns the risk aversion coefficient, named profile, and the willingness/capacity breakdown.

**Request body:**

```json
{
  "answers": {
    "q1": 2,
    "q2": 3,
    "q3": 2,
    "q4": 1,
    "q5": 2,
    "q6": 3,
    "q7": 2,
    "q8": 2,
    "q9": 2,
    "q10": 1
  }
}
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

---

### `GET /api/portfolio`

Returns the efficient frontier, GMVP (with and without short-selling), per-fund annualised returns, standard deviations, and the correlation matrix. Results are cached in memory after the first call.

---

### `GET /api/optimal?A=<float>&short=<bool>`

Returns the optimal portfolio weights, expected return, standard deviation, Sharpe ratio, and utility for the supplied risk aversion coefficient *A*.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `A` | 5.0 | Risk aversion coefficient (1–10) |
| `short` | false | Allow short-selling (`true`/`false`) |

---

### `GET /api/fund-overview`

Returns per-fund statistics (return, std dev, variance, Sharpe ratio), covariance and correlation matrices, monthly cumulative return series, and 30-day rolling volatility series for the Fund Overview page.

---

## Portfolio Mathematics Summary

Log-returns are computed and annualised (×252):

```
μ = mean(log(Pₜ/Pₜ₋₁)) × 252
Σ = cov(log(Pₜ/Pₜ₋₁)) × 252
```

**Optimal portfolio** (for risk aversion *A*):

```
max   U = w'μ − (A/2) · w'Σw
 w
s.t.  Σwᵢ = 1,  wᵢ ≥ 0
```

Solved with `scipy.optimize.minimize` using the SLSQP method.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FileNotFoundError: No files matching *.xlsx` | Run `python fetch_data.py` or add Excel files to `data/` |
| `ModuleNotFoundError` | Activate the virtual environment and re-run `pip install -r requirements.txt` |
| Port 5000 in use | `PORT=5001 python app.py` — also update the API URL in each `.jsx` file |
| Slow first portfolio load (~10 s) | Normal — frontier computation runs once then is cached |
