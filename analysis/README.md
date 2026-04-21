# Fund Selection Analysis

This folder contains the research script used to select the 10 diversified ETFs that power the robo-advisor portfolio optimizer.

## What it does

`funds_analysis.py` starts with a universe of 25 candidate ETFs spanning US sectors, international equities, fixed income, and alternatives. It uses 3 years of historical price data to iteratively remove the most-correlated fund from the most-correlated pair until 10 well-diversified funds remain. Three charts are saved as output:

| File | Description |
|------|-------------|
| `1_initial_correlation_research.png` | Correlation heatmap of all 25 candidates |
| `2_final_diversified_correlation.png` | Correlation heatmap of the final 10 selected funds |
| `3_risk_return_landscape.png` | Annualized risk vs. return scatter plot highlighting the selected funds |

### Fund universe

| Category | Tickers |
|----------|---------|
| US Sectors | SPY, QQQ, IWM, XLV, XLE, XLF, XLK |
| International | IEV, EWJ, INDA, EEM, EWT |
| Fixed Income | SHY, TLT, LQD, HYG, BND, TIP |
| Alternatives | VNQ, GLD, SLV, DBC, USO, GSG, REET |

## Setup

**Python 3.8+** is required.

```bash
pip install -r requirements.txt
```

## Running

Run from inside the `analysis/` directory so the output PNGs are saved here:

```bash
cd analysis
python funds_analysis.py
```

The script prints the final 10 tickers on completion:

```
Images saved. Final 10 tickers: ['SPY', 'TLT', ...]
```
