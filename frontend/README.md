# Frontend

React 19 single-page application built with Vite. Communicates with the Flask backend at `http://localhost:5000`.

---

## Directory Structure

```
frontend/
├── index.html             ← HTML entry point (mounts <div id="root">)
├── package.json           ← Node dependencies and npm scripts
├── vite.config.js         ← Vite config (API proxy to :5000 in dev)
└── src/
    ├── main.jsx           ← Renders <App /> into #root
    ├── App.jsx            ← BrowserRouter + side-navigation + route definitions
    ├── App.css            ← Layout, side-nav, and shared component styles
    ├── index.css          ← CSS reset / global tokens
    ├── pages/
    │   ├── HomePage.jsx          ← Landing page explaining the tool
    │   ├── QuestionnairePage.jsx ← 10-question risk assessment form
    │   ├── PortfolioPage.jsx     ← Efficient frontier + fund stats (requires data)
    │   └── FundOverviewPage.jsx  ← Per-fund analytics (cumulative return, rolling vol)
    └── components/
        └── ResultDashboard.jsx   ← Full result panel: gauge, goal planner, donut chart,
                                     fund table, frontier chart, PDF download
```

### Page / Component responsibilities

| File | What it does |
|------|-------------|
| `App.jsx` | Sets up React Router v7 with four routes (`/`, `/questionnaire`, `/portfolio`, `/funds`). Renders the persistent side-navigation. |
| `HomePage.jsx` | Static marketing/explainer page. No API calls. |
| `QuestionnairePage.jsx` | Renders questions from `GET /api/questions`, collects answers, posts to `POST /api/score`, and passes the result to `ResultDashboard`. |
| `ResultDashboard.jsx` | Receives the risk-score API response plus the investor's goal inputs. Calls `GET /api/optimal?A=<value>` to fetch recommended weights, then renders the full output (risk gauge, goal planner, allocation donut, fund weight table, frontier chart, PDF export). |
| `PortfolioPage.jsx` | Calls `GET /api/portfolio` to display the raw efficient frontier, GMVP stats, and correlation matrix heatmap. Useful for exploring the fund universe without a specific risk profile. |
| `FundOverviewPage.jsx` | Calls `GET /api/fund-overview` and shows per-fund cumulative return line charts, rolling 30-day volatility, and a Sharpe ratio comparison. |

---

## Local Setup

### Prerequisites

- Node.js 18 or later
- npm 9 or later

Check versions:

```bash
node --version
npm --version
```

### 1. Install dependencies

```bash
cd frontend
npm install
```

This installs all packages listed in `package.json` into `node_modules/`. Only needed the first time (or after `package.json` changes).

### 2. Start the development server

```bash
npm run dev
```

The app is served at **http://localhost:5173**.

Vite proxies all `/api/*` requests to `http://localhost:5000`, so the Flask backend must also be running. See [backend/README.md](../backend/README.md) for backend setup.

### 3. Other npm scripts

| Script | Command | What it does |
|--------|---------|-------------|
| Dev server | `npm run dev` | Starts Vite dev server with HMR at :5173 |
| Production build | `npm run build` | Compiles and bundles into `frontend/dist/` |
| Preview build | `npm run preview` | Serves the production build locally for testing |
| Lint | `npm run lint` | Runs ESLint on all source files |

---

## Production Build

To serve the React app through Flask on a single port (no separate Node process):

```bash
cd frontend
npm run build          # outputs to frontend/dist/

cd ../backend
python app.py          # Flask serves React at http://localhost:5000
```

Flask is configured to fall through to `frontend/dist/index.html` for any non-API route.

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `react` + `react-dom` | ^19 | UI framework |
| `react-router-dom` | ^7 | Client-side routing |
| `recharts` | ^3 | All charts (line, area, scatter, pie/donut) |
| `lucide-react` | ^1 | Icon set used in the nav and dashboard |

### Dev

| Package | Purpose |
|---------|---------|
| `vite` + `@vitejs/plugin-react` | Build tool and React fast-refresh |
| `eslint` + plugins | Linting (React hooks, react-refresh rules) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to Flask server" | Start the backend: `python app.py` in `backend/` |
| Charts show no data | Backend needs Excel files in `backend/data/` — run `python fetch_data.py` |
| Port 5173 already in use | Vite will automatically try the next available port; check the terminal output |
| `npm install` fails | Ensure Node ≥ 18 is installed; delete `node_modules/` and retry |
| API calls return 404 in production build | Rebuild with `npm run build` after any frontend changes |
