"""
generate_charts.py
==================
Generates static PNG charts from fund data and saves them to ./charts/.
These are for offline reference / reporting — NOT served to the frontend
(the frontend renders its own interactive Recharts visualisations).

Usage:
    cd backend/
    python fetch_data.py        # ensure ./data/ is populated first
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
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # non-interactive backend — safe for scripts
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns

from portfolio_math import load_prices, compute_stats

CHARTS_DIR = os.path.join(os.path.dirname(__file__), "charts")

FUND_COLORS = [
    "#c9a84c", "#38bdf8", "#4ade80", "#f87171", "#a78bfa",
    "#fb923c", "#34d399", "#f472b6", "#60a5fa", "#facc15",
]

DARK_BG  = "#0f1117"
SURFACE  = "#1a1d27"
BORDER   = "#2a2d3a"
TEXT     = "#e2e8f0"
MUTED    = "#64748b"
GOLD     = "#c9a84c"


def _apply_dark_style(fig, ax_list):
    """Apply consistent dark theme to a figure."""
    fig.patch.set_facecolor(DARK_BG)
    for ax in (ax_list if isinstance(ax_list, (list, np.ndarray)) else [ax_list]):
        if hasattr(ax, "__iter__"):
            for a in np.array(ax).flat:
                _style_ax(a)
        else:
            _style_ax(ax)


def _style_ax(ax):
    ax.set_facecolor(SURFACE)
    ax.tick_params(colors=MUTED, labelsize=8)
    ax.xaxis.label.set_color(MUTED)
    ax.yaxis.label.set_color(MUTED)
    ax.title.set_color(TEXT)
    for spine in ax.spines.values():
        spine.set_edgecolor(BORDER)


def save(fig, name):
    os.makedirs(CHARTS_DIR, exist_ok=True)
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  [OK]  {path}")


# ─── 1. Variance-Covariance Matrix ────────────────────────────────────────────
def chart_covariance(cov: pd.DataFrame):
    fig, ax = plt.subplots(figsize=(9, 7))
    _apply_dark_style(fig, ax)

    cmap = sns.diverging_palette(10, 45, s=80, l=40, as_cmap=True)
    sns.heatmap(
        cov * 100,          # display as % (multiply by 100 for readability)
        ax=ax,
        cmap=cmap,
        annot=True, fmt=".3f", annot_kws={"size": 7, "color": TEXT},
        linewidths=0.5, linecolor=BORDER,
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Variance-Covariance Matrix (ann., ×100)", fontsize=11, pad=14, color=TEXT)
    ax.tick_params(axis="x", rotation=45, labelsize=8, colors=MUTED)
    ax.tick_params(axis="y", rotation=0,  labelsize=8, colors=MUTED)
    cb = ax.collections[0].colorbar
    cb.ax.tick_params(colors=MUTED, labelsize=7)
    cb.ax.yaxis.label.set_color(MUTED)

    save(fig, "variance_covariance_matrix.png")


# ─── 2. Correlation Matrix ────────────────────────────────────────────────────
def chart_correlation(corr: pd.DataFrame):
    fig, ax = plt.subplots(figsize=(9, 7))
    _apply_dark_style(fig, ax)

    cmap = sns.diverging_palette(10, 45, s=80, l=45, as_cmap=True)
    mask = np.zeros_like(corr, dtype=bool)
    mask[np.triu_indices_from(mask, k=1)] = True   # upper triangle only

    sns.heatmap(
        corr,
        ax=ax,
        mask=mask,
        cmap=cmap,
        vmin=-1, vmax=1,
        annot=True, fmt=".2f", annot_kws={"size": 8, "color": TEXT},
        linewidths=0.5, linecolor=BORDER,
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Correlation Matrix (lower triangle)", fontsize=11, pad=14, color=TEXT)
    ax.tick_params(axis="x", rotation=45, labelsize=8, colors=MUTED)
    ax.tick_params(axis="y", rotation=0,  labelsize=8, colors=MUTED)
    cb = ax.collections[0].colorbar
    cb.ax.tick_params(colors=MUTED, labelsize=7)

    save(fig, "correlation_matrix.png")


# ─── 3. Average Annual Returns (bar) ─────────────────────────────────────────
def chart_avg_returns(mu: pd.Series):
    fig, ax = plt.subplots(figsize=(9, 5))
    _apply_dark_style(fig, ax)

    names  = list(mu.index)
    values = mu.values * 100
    colors = [FUND_COLORS[i % len(FUND_COLORS)] for i in range(len(names))]
    bars   = ax.bar(names, values, color=colors, width=0.6, zorder=3)

    ax.axhline(0, color=BORDER, linewidth=1)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.set_title("Annualised Average Return by Fund (2019-2024)", fontsize=11, pad=12, color=TEXT)
    ax.set_ylabel("Return (%)", fontsize=9)
    ax.tick_params(axis="x", rotation=30, labelsize=8)
    ax.grid(axis="y", color=BORDER, linewidth=0.5, zorder=0)

    for bar, v in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2,
                v + (0.3 if v >= 0 else -0.8),
                f"{v:.1f}%", ha="center", va="bottom" if v >= 0 else "top",
                fontsize=7, color=TEXT)

    save(fig, "avg_returns_bar.png")


# ─── 4. Standard Deviation (bar) ─────────────────────────────────────────────
def chart_std_deviation(cov: pd.DataFrame):
    std = np.sqrt(np.diag(cov.values)) * 100
    names = list(cov.index)

    fig, ax = plt.subplots(figsize=(9, 5))
    _apply_dark_style(fig, ax)

    colors = [FUND_COLORS[i % len(FUND_COLORS)] for i in range(len(names))]
    bars   = ax.bar(names, std, color=colors, width=0.6, zorder=3)

    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.set_title("Annualised Standard Deviation by Fund (2019-2024)", fontsize=11, pad=12, color=TEXT)
    ax.set_ylabel("Std Dev (%)", fontsize=9)
    ax.tick_params(axis="x", rotation=30, labelsize=8)
    ax.grid(axis="y", color=BORDER, linewidth=0.5, zorder=0)

    for bar, v in zip(bars, std):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.2,
                f"{v:.1f}%", ha="center", va="bottom", fontsize=7, color=TEXT)

    save(fig, "std_deviation_bar.png")


# ─── 5. Cumulative Returns (line) ─────────────────────────────────────────────
def chart_cumulative_returns(prices: pd.DataFrame):
    monthly = prices.resample("ME").last()
    cum     = monthly / monthly.iloc[0] * 100

    fig, ax = plt.subplots(figsize=(12, 6))
    _apply_dark_style(fig, ax)

    for i, col in enumerate(cum.columns):
        ax.plot(cum.index, cum[col], label=col,
                color=FUND_COLORS[i % len(FUND_COLORS)], linewidth=1.6)

    ax.axhline(100, color=BORDER, linewidth=1, linestyle="--")
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f"))
    ax.set_title("Cumulative Price Growth (Jan 2019 = 100)", fontsize=11, pad=12, color=TEXT)
    ax.set_ylabel("Index (100 = Jan 2019)", fontsize=9)
    ax.legend(fontsize=7, ncol=5, loc="upper left",
              facecolor=SURFACE, edgecolor=BORDER, labelcolor=TEXT)
    ax.grid(color=BORDER, linewidth=0.4)
    fig.autofmt_xdate(rotation=30, ha="right")

    save(fig, "cumulative_returns.png")


# ─── 6. Rolling 30-Day Volatility (line) ──────────────────────────────────────
def chart_rolling_volatility(prices: pd.DataFrame):
    log_ret  = np.log(prices / prices.shift(1)).dropna()
    roll_vol = log_ret.rolling(30).std() * np.sqrt(252) * 100
    monthly  = roll_vol.resample("ME").last().dropna()

    fig, ax = plt.subplots(figsize=(12, 6))
    _apply_dark_style(fig, ax)

    for i, col in enumerate(monthly.columns):
        ax.plot(monthly.index, monthly[col], label=col,
                color=FUND_COLORS[i % len(FUND_COLORS)], linewidth=1.6)

    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    ax.set_title("30-Day Rolling Volatility — Annualised (2019-2024)", fontsize=11, pad=12, color=TEXT)
    ax.set_ylabel("Volatility (%)", fontsize=9)
    ax.legend(fontsize=7, ncol=5, loc="upper right",
              facecolor=SURFACE, edgecolor=BORDER, labelcolor=TEXT)
    ax.grid(color=BORDER, linewidth=0.4)
    fig.autofmt_xdate(rotation=30, ha="right")

    save(fig, "rolling_volatility.png")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("Loading price data from ./data/ …")
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
