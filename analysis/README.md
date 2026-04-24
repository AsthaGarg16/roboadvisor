# analysis/

Fund selection research and static chart generation scripts.

## Scripts

| Script | Purpose |
|--------|---------|
| `funds_analysis.py` | Selects 10 diversified ETFs from a 25-fund universe via greedy correlation pruning |
| `fetch_data.py` | Downloads historical price data from yfinance and saves to `../data/` |
| `generate_charts.py` | Generates 6 static PNG report charts from `../data/` |

## Usage

```bash
cd analysis/
python3 funds_analysis.py   # fund selection — outputs 3 research PNGs
python3 fetch_data.py       # download price data → ../data/
python3 generate_charts.py  # generate report charts → charts/
```

## Output Charts

| File | Description |
|------|-------------|
| `1_initial_correlation_research.png` | Correlation heatmap — all 25 candidates |
| `2_final_diversified_correlation.png` | Correlation heatmap — final 10 selected funds |
| `3_risk_return_landscape.png` | Annualised risk vs. return scatter |
| `charts/variance_covariance_matrix.png` | Annualised variance-covariance heatmap |
| `charts/correlation_matrix.png` | Pearson correlation matrix |
| `charts/avg_returns_bar.png` | Annualised average return per fund |
| `charts/std_deviation_bar.png` | Annualised standard deviation per fund |
| `charts/cumulative_returns.png` | Cumulative price growth indexed to 100 |
| `charts/rolling_volatility.png` | 30-day rolling annualised volatility |

## Setup

```bash
pip install -r requirements.txt
```
