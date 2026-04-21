import yfinance as yf
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

# 1. Define the "Universe" (25 Candidates)
candidates = [
    "SPY", "QQQ", "IWM", "XLV", "XLE", "XLF", "XLK",   # US Sectors
    "IEV", "EWJ", "INDA", "EEM", "EWT",               # International
    "SHY", "TLT", "LQD", "HYG", "BND", "TIP",         # Fixed Income
    "VNQ", "GLD", "SLV", "DBC", "USO", "GSG", "REET"  # Alternatives
]

def select_and_save_research(tickers, target_count=10):
    # Fetch 3 years of data for statistical depth
    raw = yf.download(tickers, period="3y", auto_adjust=True, progress=False)
    data = raw['Close'] if isinstance(raw.columns, pd.MultiIndex) else raw[['Close']]
    data = data.dropna(axis=1, how='all')  # drop tickers with no data

    available = list(data.columns)
    if len(available) < target_count:
        raise ValueError(f"Only {len(available)} tickers have data; need at least {target_count}.")

    returns = data.pct_change().dropna()

    # --- CHART 1: INITIAL CORRELATION (Heatmap) ---
    plt.figure(figsize=(12, 10))
    sns.heatmap(returns.corr(), cmap='coolwarm', center=0)
    plt.title(f"Initial Research: Correlation of {len(available)} Candidate Funds")
    plt.tight_layout()
    # Save for the "Data Selection" section of your report
    plt.savefig("1_initial_correlation_research.png", dpi=300)
    plt.close()

    current_tickers = available
    
    # Algorithmic Elimination Loop
    while len(current_tickers) > target_count:
        subset_corr = returns[current_tickers].corr()
        mask = np.ones(subset_corr.shape, dtype=bool)
        np.fill_diagonal(mask, 0)
        max_corr_val = subset_corr.where(mask).max().max()
        indices = np.where(subset_corr == max_corr_val)
        pair = (subset_corr.index[indices[0][0]], subset_corr.columns[indices[1][0]])
        avg_corr = subset_corr.mean()
        to_remove = pair[0] if avg_corr[pair[0]] > avg_corr[pair[1]] else pair[1]
        current_tickers.remove(to_remove)

    # --- CHART 2: FINAL CORRELATION (Heatmap) ---
    final_returns = returns[current_tickers]
    plt.figure(figsize=(10, 8))
    sns.heatmap(final_returns.corr(), annot=True, cmap='coolwarm', center=0, fmt=".2f")
    plt.title("Final Selection: Correlation of Selected 10 Funds")
    plt.tight_layout()
    plt.savefig("2_final_diversified_correlation.png", dpi=300)
    plt.close()

    # --- CHART 3: RISK-RETURN LANDSCAPE ---
    mu = returns.mean() * 252
    sigma = returns.std() * np.sqrt(252)
    
    plt.figure(figsize=(10, 6))
    plt.scatter(sigma, mu, color='lightgrey', alpha=0.5, label='Excluded Funds')
    plt.scatter(sigma[current_tickers], mu[current_tickers], color='blue', s=100, label='Selected 10')
    
    for t in current_tickers:
        plt.annotate(t, (sigma[t], mu[t]), xytext=(5, 5), textcoords='offset points')
        
    plt.title("Research Discovery: Risk-Return Profile of Selected Funds")
    plt.xlabel("Annualized Volatility (Risk)")
    plt.ylabel("Annualized Return")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig("3_risk_return_landscape.png", dpi=300)
    plt.close()

    return current_tickers

# Run the script
final_10 = select_and_save_research(candidates)
print(f"Images saved. Final 10 tickers: {final_10}")