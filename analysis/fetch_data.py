"""
fetch_data.py
=============
Downloads historical closing prices for the 10 portfolio funds using yfinance
and saves each as an Excel file in <project_root>/data/.

Usage:
    cd analysis/
    python fetch_data.py

Output:
    ../data/SPY.xlsx, ../data/QQQ.xlsx, ... (one file per ticker)
    Each file has two columns: Date | Close
"""

import os
import yfinance as yf
import pandas as pd

TICKERS    = ['EWJ', 'GLD', 'INDA', 'SHY', 'USO', 'VNQ', 'XLE', 'XLF', 'XLK', 'XLV']
START_DATE = "2019-01-01"
END_DATE   = "2024-12-31"
DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def fetch_and_save():
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"Downloading data for: {', '.join(TICKERS)}")
    print(f"Period: {START_DATE} → {END_DATE}\n")

    raw = yf.download(TICKERS, start=START_DATE, end=END_DATE, auto_adjust=True)
    close = raw["Close"]

    saved = []
    for ticker in TICKERS:
        if ticker not in close.columns:
            print(f"  [WARN] {ticker}: no data returned, skipping.")
            continue

        series = close[ticker].dropna().reset_index()
        series.columns = ["Date", "Close"]
        series["Date"] = series["Date"].dt.strftime("%Y-%m-%d")

        out_path = os.path.join(DATA_DIR, f"{ticker}.xlsx")
        series.to_excel(out_path, index=False)
        saved.append(ticker)
        print(f"  [OK]  {ticker}: {len(series)} rows → {out_path}")

    print(f"\nDone. Saved {len(saved)}/{len(TICKERS)} files to {DATA_DIR}/")


if __name__ == "__main__":
    fetch_and_save()
