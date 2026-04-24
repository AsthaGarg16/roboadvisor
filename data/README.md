# data/

Shared price data folder used by the Flask backend and analysis scripts.

One `.xlsx` file per fund — column 0 = Date, column 1 = Close price.

## Current Funds

| Ticker | Description |
|--------|-------------|
| EWJ | iShares MSCI Japan ETF |
| GLD | SPDR Gold Shares |
| INDA | iShares MSCI India ETF |
| SHY | iShares 1–3 Year Treasury Bond ETF |
| USO | United States Oil Fund |
| VNQ | Vanguard Real Estate ETF |
| XLE | Energy Select Sector SPDR ETF |
| XLF | Financial Select Sector SPDR ETF |
| XLK | Technology Select Sector SPDR ETF |
| XLV | Health Care Select Sector SPDR ETF |

## Populating

```bash
cd analysis/
python3 fetch_data.py
```

## Adding Custom Funds

Drop any `.xlsx` with the format above into this folder. The filename (without extension) becomes the fund label in the UI.
