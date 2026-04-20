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
        └── ResultDashboard.jsx     ← risk gauge, goal planner, allocation charts, PDF export
```

### Page responsibilities

| File | What it does |
|------|-------------|
| `App.jsx` | React Router v7 with five routes. Renders the persistent side-navigation and theme toggle. |
| `QuestionnairePage.jsx` | Fetches questions, collects answers, posts to `/api/score`, caches the result in `sessionStorage`, and renders `ResultDashboard`. |
| `MyPortfolioPage.jsx` | Reads the cached result from `sessionStorage` and re-renders `ResultDashboard`. Shows a prompt to take the assessment if no result exists. Clears on browser refresh. |
| `ResultDashboard.jsx` | Receives the score API response. Fetches optimal weights via `/api/optimal?A=`, then renders risk gauge, portfolio recommendation, goal planner, frontier chart, and PDF export. |
| `PortfolioPage.jsx` | Calls `/api/portfolio` — frontier, GMVP, correlation heatmap. Useful for exploring the fund universe without a risk profile. |
| `FundOverviewPage.jsx` | Calls `/api/fund-overview` — per-fund cumulative return, rolling volatility, Sharpe ratio, covariance/correlation matrices. |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` ^19 | UI framework |
| `react-router-dom` ^7 | Client-side routing |
| `recharts` ^3 | Charts (line, area, scatter, bar, donut) |
| `lucide-react` | Icons |
| `vite` + `@vitejs/plugin-react` | Build tool + fast refresh |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to Flask server" | Start the backend: `python app.py` in `backend/` |
| Charts show no data | Run `python fetch_data.py` to populate `backend/data/` |
| Port 5173 already in use | Vite picks the next free port — check terminal output |
| `npm install` fails | Ensure Node ≥ 18; delete `node_modules/` and retry |
