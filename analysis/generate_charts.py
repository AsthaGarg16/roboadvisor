"""
generate_charts.py
==================
Generates static PNG charts from fund data and saves them to <project_root>/analysis/charts/.
These are for offline reference / reporting — NOT served to the frontend.

Usage:
    cd analysis/
    python fetch_data.py        # ensure ../data/ is populated first
    python generate_charts.py

Output (./charts/):
    variance_covariance_matrix.png
    correlation_matrix.png
    avg_returns_bar.png
    std_deviation_bar.png
    cumulative_returns.png
    rolling_volatility.png
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns

# Allow imports from backend/
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from portfolio_data import load_prices
from portfolio_optimizer import compute_stats

CHARTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "charts")

FUND_COLORS = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
]


def save(fig, name):
    os.makedirs(CHARTS_DIR, exist_ok=True)
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK]  {path}")


# ─── 1. Variance-Covariance Matrix ────────────────────────────────────────────
def chart_covariance(cov: pd.DataFrame):
    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(
        cov * 100,
        ax=ax, cmap="coolwarm",
        annot=True, fmt=".3f", annot_kws={"size": 7},
        linewidths=0.5, cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Variance-Covariance Matrix (ann., ×100)", fontsize=11, pad=14)
    ax.tick_params(axis="x", rotation=45, labelsize=8)
    ax.tick_params(axis="y", rotation=0,  labelsize=8)
    save(fig, "variance_covariance_matrix.png")


# ─── 2. Correlation Matrix ────────────────────────────────────────────────────
def chart_correlation(corr: pd.DataFrame):
    fig, ax = plt.subplots(figsize=(9, 7))
    mask = np.zeros_like(corr, dtype=bool)
    mask[np.triu_indices_from(mask, k=1)] = True
    sns.heatmap(
        corr, ax=ax, mask=mask, cmap="coolwarm",
        vmin=-1, vmax=1,
        annot=True, fmt=".2f", annot_kws={"size": 8},
        linewidths=0.5, cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Correlation Matrix (lower triangle)", fontsize=11, pad=14)
    ax.tick_params(axis="x", rotation=45, labelsize=8)
    ax.tick_params(axis="y", rotation=0,  labelsize=8)
    save(fig, "correlation_matrix.png")


# ─── 3. Average Annual Returns (bar) ─────────────────────────────────────────
def chart_avg_returns(mu: pd.Series):
    fig, ax = plt.subplots(figsize=(9, 5))
    names  = list(mu.index)
    values = mu.values * 100
    colors = [FUND_COLORS[i % len(FUND_COLORS)] for i in range(len(names))]
    bars   = ax.bar(names, values, color=colors, width=0.6)
    ax.axhline(0, color="black", linewidth=0.8)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.set_title("Annualised Average Return by Fund (2019-2024)", fontsize=11, pad=12)
    ax.set_ylabel("Return (%)", fontsize=9)
    ax.tick_params(axis="x", rotation=30, labelsize=8)
    ax.grid(axis="y", linewidth=0.5, alpha=0.5)
    for bar, v in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2,
                v + (0.3 if v >= 0 else -0.8),
                f"{v:.1f}%", ha="center", va="bottom" if v >= 0 else "top", fontsize=7)
    save(fig, "avg_returns_bar.png")


# ─── 4. Standard Deviation (bar) ─────────────────────────────────────────────
def chart_std_deviation(cov: pd.DataFrame):
    std   = np.sqrt(np.diag(cov.values)) * 100
    names = list(cov.index)
    fig, ax = plt.subplots(figsize=(9, 5))
    colors = [FUND_COLORS[i % len(FUND_COLORS)] for i in range(len(names))]
    bars   = ax.bar(names, std, color=colors, width=0.6)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.set_title("Annualised Standard Deviation by Fund (2019-2024)", fontsize=11, pad=12)
    ax.set_ylabel("Std Dev (%)", fontsize=9)
    ax.tick_params(axis="x", rotation=30, labelsize=8)
    ax.grid(axis="y", linewidth=0.5, alpha=0.5)
    for bar, v in zip(bars, std):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.2,
                f"{v:.1f}%", ha="center", va="bottom", fontsize=7)
    save(fig, "std_deviation_bar.png")


# ─── 5. Cumulative Returns (line) ─────────────────────────────────────────────
def chart_cumulative_returns(prices: pd.DataFrame):
    monthly = prices.resample("ME").last()
    cum     = monthly / monthly.iloc[0] * 100
    fig, ax = plt.subplots(figsize=(12, 6))
    for i, col in enumerate(cum.columns):
        ax.plot(cum.index, cum[col], label=col,
                color=FUND_COLORS[i % len(FUND_COLORS)], linewidth=1.6)
    ax.axhline(100, color="black", linewidth=0.8, linestyle="--")
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f"))
    ax.set_title("Cumulative Price Growth (Jan 2019 = 100)", fontsize=11, pad=12)
    ax.set_ylabel("Index (100 = Jan 2019)", fontsize=9)
    ax.legend(fontsize=7, ncol=5, loc="upper left")
    ax.grid(linewidth=0.4, alpha=0.5)
    fig.autofmt_xdate(rotation=30, ha="right")
    save(fig, "cumulative_returns.png")


# ─── 6. Rolling 30-Day Volatility (line) ──────────────────────────────────────
def chart_rolling_volatility(prices: pd.DataFrame):
    log_ret  = np.log(prices / prices.shift(1)).dropna()
    roll_vol = log_ret.rolling(30).std() * np.sqrt(252) * 100
    monthly  = roll_vol.resample("ME").last().dropna()
    fig, ax = plt.subplots(figsize=(12, 6))
    for i, col in enumerate(monthly.columns):
        ax.plot(monthly.index, monthly[col], label=col,
                color=FUND_COLORS[i % len(FUND_COLORS)], linewidth=1.6)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    ax.set_title("30-Day Rolling Volatility — Annualised (2019-2024)", fontsize=11, pad=12)
    ax.set_ylabel("Volatility (%)", fontsize=9)
    ax.legend(fontsize=7, ncol=5, loc="upper right")
    ax.grid(linewidth=0.4, alpha=0.5)
    fig.autofmt_xdate(rotation=30, ha="right")
    save(fig, "rolling_volatility.png")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("Loading price data from ../data/ …")
    prices = load_prices()
    mu, cov, corr = compute_stats(prices)
    cov_df  = pd.DataFrame(cov, index=mu.index, columns=mu.index)
    corr_df = pd.DataFrame(corr, index=mu.index, columns=mu.index)

    print(f"\nGenerating charts → {CHARTS_DIR}/\n")
    chart_covariance(cov_df)
    chart_correlation(corr_df)
    chart_avg_returns(mu)
    chart_std_deviation(cov_df)
    chart_cumulative_returns(prices)
    chart_rolling_volatility(prices)

    print(f"\nAll 6 charts saved to {CHARTS_DIR}/")


if __name__ == "__main__":
    main()
