# data/

Shared price data folder used by both the backend (Flask API) and the analysis scripts.

## Contents

One `.xlsx` file per fund. Each file has exactly two columns:

| Column 0 | Column 1 |
|---|---|
| Date | Close |
| 2019-01-02 | 123.45 |
| 2019-01-03 | 124.01 |
| ... | ... |

## Current funds

| Ticker | Description |
|---|---|
| SPY | SPDR S&P 500 ETF — U.S. large-cap equity |
| QQQ | Invesco NASDAQ-100 ETF — U.S. growth / technology |
| EEM | iShares MSCI Emerging Markets ETF |
| IEV | iShares Europe ETF — international developed |
| INDA | iShares MSCI India ETF — single-country emerging market |
| VNQ | Vanguard Real Estate ETF |
| GLD | SPDR Gold Shares — commodity / crisis hedge |
| SHY | iShares 1–3 Year Treasury Bond ETF — short-duration fixed income |
| HYG | iShares iBoxx High Yield Corporate Bond ETF |
| XLV | Health Care Select Sector SPDR ETF — defensive sector |

## Populating this folder

Run `fetch_data.py` from the `analysis/` directory:

```bash
cd analysis/
python3 fetch_data.py
```

This downloads 2019-01-01 to 2024-12-31 closing prices for all 10 tickers via yfinance.

## Adding custom funds

Drop any `.xlsx` file with the format above into this folder. The filename (without
extension) becomes the fund label in the UI. All files are aligned on their common
date range — dates missing from any file are dropped.
