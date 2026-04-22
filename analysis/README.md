# analysis/

This folder contains the fund selection research and static chart generation scripts.

## Scripts

| Script | Purpose |
|---|---|
| `funds_analysis.py` | Selects 10 diversified ETFs from a 25-fund universe via greedy correlation pruning |
| `fetch_data.py` | Downloads historical price data from yfinance and saves to `../data/` |
| `generate_charts.py` | Generates 6 static PNG report charts from the data in `../data/` |

---

## funds_analysis.py — Fund Selection (25 → 10)

Starts with 25 candidate ETFs spanning US sectors, international equities, fixed income,
and alternatives. Uses 3 years of daily price data to iteratively remove the most
redundant fund (highest average pairwise correlation within the most-correlated pair)
until 10 well-diversified funds remain.

### Candidate universe

| Category | Tickers |
|---|---|
| US Sectors | SPY, QQQ, IWM, XLV, XLE, XLF, XLK |
| International | IEV, EFA, INDA, EEM, EWT |
| Fixed Income | SHY, TLT, LQD, HYG, BND, TIP |
| Alternatives | VNQ, GLD, SLV, DBC, USO, GSG, REET |

### Output charts

| File | Description |
|---|---|
| `1_initial_correlation_research.png` | Correlation heatmap of all 25 candidates |
| `2_final_diversified_correlation.png` | Correlation heatmap of the final 10 selected funds |
| `3_risk_return_landscape.png` | Annualised risk vs. return scatter plot highlighting selected funds |

### Usage

```bash
cd analysis/
python3 funds_analysis.py
```

---

## fetch_data.py — Download Price Data

Downloads daily closing prices for the 10 selected funds from yfinance and saves one
`.xlsx` file per ticker into `../data/`.

```bash
cd analysis/
python3 fetch_data.py
```

---

## generate_charts.py — Static Report Charts

Reads fund data from `../data/` and generates 6 publication-quality PNG charts into
`analysis/charts/`. Imports math modules from `../backend/` via `sys.path`.

```bash
cd analysis/
python3 generate_charts.py
```

### Output charts

| File | Description |
|---|---|
| `charts/variance_covariance_matrix.png` | Annualised variance-covariance matrix heatmap |
| `charts/correlation_matrix.png` | Pearson correlation matrix (lower triangle) |
| `charts/avg_returns_bar.png` | Annualised average return per fund (2019–2024) |
| `charts/std_deviation_bar.png` | Annualised standard deviation per fund (2019–2024) |
| `charts/cumulative_returns.png` | Cumulative price growth indexed to 100 at Jan 2019 |
| `charts/rolling_volatility.png` | 30-day rolling annualised volatility (2019–2024) |

---

## Setup

```bash
pip install -r requirements.txt
```
