# Frontend

React 19 single-page application built with Vite. Communicates with the Flask backend at `http://localhost:5001`.

## Local Setup

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

The Flask backend must also be running. See [backend/README.md](../backend/README.md).

### npm scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR at :5173 |
| `npm run build` | Production bundle → `frontend/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint across all source files |

---

## Directory Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx               ← router, side-nav, theme toggle
    ├── App.css               ← layout, nav, shared component styles
    ├── index.css             ← CSS reset + design tokens (dark/light themes)
    ├── pages/
    │   ├── HomePage.jsx            ← landing / explainer
    │   ├── QuestionnairePage.jsx   ← 10-question risk assessment
    │   ├── MyPortfolioPage.jsx     ← cached assessment result (sessionStorage)
    │   ├── PortfolioPage.jsx       ← efficient frontier + correlation heatmap
    │   └── FundOverviewPage.jsx    ← per-fund analytics
    └── components/
        └── ResultDashboard.jsx     ← risk gauge, portfolio recommendation, Monte Carlo simulation,
                                       goal planner, frontier chart, fund analytics, PDF export
```

### Page responsibilities

| File | What it does |
|------|-------------|
| `App.jsx` | React Router v7 with five routes. Renders the persistent side-navigation and theme toggle. |
| `QuestionnairePage.jsx` | Fetches questions, collects answers, posts to `/api/score`, caches the result in `sessionStorage`, and renders `ResultDashboard`. |
| `MyPortfolioPage.jsx` | Reads the cached result from `sessionStorage` and re-renders `ResultDashboard`. Shows a prompt to take the assessment if no result exists. Clears on browser refresh. |
| `ResultDashboard.jsx` | Main portfolio dashboard. Fetches optimal weights via `/api/optimal?A=`, runs Monte Carlo via `/api/monte-carlo`, and renders all sections listed below. |
| `PortfolioPage.jsx` | Calls `/api/portfolio` — frontier, GMVP, correlation heatmap. Useful for exploring the fund universe without a risk profile. |
| `FundOverviewPage.jsx` | Calls `/api/fund-overview` — per-fund cumulative return, rolling volatility, Sharpe ratio, covariance/correlation matrices. |

### ResultDashboard sections

| Band | Content |
|------|---------|
| **Risk Assessment Results** | Risk aversion gauge, A / avg-score / expected-return metrics, utility formula, risk-alert banner, collapsible answer breakdown |
| **Portfolio Recommendation** | Asset class donut chart, no-short / short-sales toggle, fund allocation table with weights and position badges, efficient frontier scatter chart |
| **Monte Carlo Simulation** | 2026 outlook: run-simulation button, 6 key-stat cards (expected value, median, VaR 95%, CVaR, probability of profit, max drawdown), percentile fan chart (p5–p95), final-value distribution histogram |
| **Goal Planner** | Investable capital input, goal editor modal (name / horizon / target FV), weighted required return (WRR), goal-based minimum-variance portfolio |
| **Fund Analytics Overview** | Average annual return bar chart, variance-covariance heatmap |
| **Actions** | Download PDF summary, restart assessment |

---

## Monte Carlo Visualisations

`ResultDashboard.jsx` contains two dedicated chart components:

**`MonteCarloFanChart`** — `ComposedChart` with stacked `Area` layers representing the p5–p25, p25–p50, p50–p75, and p75–p95 percentile bands, overlaid with a `Line` for the median (p50) path. Red outer tails indicate the downside range; gold inner band shows the interquartile spread.

**`MonteCarloHistogram`** — `BarChart` of the 40-bin final portfolio value distribution. Bars below the initial capital are red; bars above are green.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` ^19 | UI framework |
| `react-router-dom` ^7 | Client-side routing |
| `recharts` ^3 | Charts — ScatterChart, AreaChart, ComposedChart, BarChart, PieChart |
| `lucide-react` | Icons |
| `vite` + `@vitejs/plugin-react` | Build tool + fast refresh |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to Flask server" | Start the backend: `python app.py` in `backend/` |
| Charts show no data | Run `python fetch_data.py` to populate `backend/data/` |
| Monte Carlo button does nothing | Ensure Flask is running and the `/api/monte-carlo` route is reachable |
| Port 5173 already in use | Vite picks the next free port — check terminal output |
| `npm install` fails | Ensure Node ≥ 18; delete `node_modules/` and retry |
