# Frontend

React 19 single-page application built with Vite. Requires the Flask backend running on port 5001.

## Local Setup

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page |
| Risk Profile | `/questionnaire` | 10-question assessment → risk score + optimal portfolio |
| My Portfolio | `/my-portfolio` | Cached assessment result (sessionStorage) |
| Frontier & Analytics | `/portfolio` | Efficient frontier, GMVP, correlation heatmap |
| Fund Overview | `/fund-overview` | Per-fund cumulative return, rolling volatility, Sharpe ratio |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to Flask server" | Start the backend: `python app.py` in `backend/` |
| Charts show no data | Run `python fetch_data.py` in `analysis/` to populate `data/` |
| `npm install` fails | Ensure Node ≥ 18; delete `node_modules/` and retry |
