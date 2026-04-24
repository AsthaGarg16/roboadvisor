# Backend

Python / Flask REST API — questionnaire scoring, portfolio optimisation, and Monte Carlo simulation.

Runs on **http://localhost:5001** in development.

## Local Setup

```bash
cd backend
source ../venv/bin/activate        # Windows: ..\venv\Scripts\activate
python app.py
```

## Files

| File | Responsibility |
|------|---------------|
| `app.py` | Flask routes, questionnaire questions, risk scoring |
| `portfolio_optimizer.py` | Pure maths — statistics, GMVP, efficient frontier, SLSQP optimiser |
| `portfolio_data.py` | Data loading, Monte Carlo simulation, in-memory caching |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Questionnaire questions |
| POST | `/api/score` | Answers → risk aversion A + profile |
| GET | `/api/portfolio` | Frontier, GMVP, fund stats, correlation matrix |
| GET | `/api/optimal?A=` | Optimal weights for a given A |
| GET | `/api/optimal_for_return?target_return=` | Min-variance portfolio for a target return |
| GET | `/api/monte-carlo?A=` | Monte Carlo simulation — percentile paths + risk stats |
| GET | `/api/fund-overview` | Per-fund stats, cumulative returns, rolling volatility |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FileNotFoundError: No files matching *.xlsx` | Run `python fetch_data.py` in `analysis/` |
| `ModuleNotFoundError` | Activate the venv and re-run `pip install -r requirements.txt` |
| Slow first portfolio load | Normal — frontier is computed once then cached in memory |
