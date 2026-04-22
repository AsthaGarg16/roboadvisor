"""
portfolio_data.py
=================
Data loading, Monte Carlo simulation, in-process caching, and
aggregated response builders used by the Flask routes.

Depends on portfolio_optimizer for all pure-math calls.
"""

import os, glob
import numpy as np
import pandas as pd

from portfolio_optimizer import (
    compute_stats,
    port_perf,
    solve_gmvp_no_short,
    solve_gmvp_short,
    build_frontier,
    solve_optimal_portfolio,
)

# ─── CONFIG ──────────────────────────────────────────────────────────────────
FOLDER    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
PATTERN   = "*.xlsx"
DATE_COL  = 0
PRICE_COL = 1


# ─── DATA LOADING ─────────────────────────────────────────────────────────────
def load_prices() -> pd.DataFrame:
    files = sorted(glob.glob(os.path.join(FOLDER, PATTERN)))
    if not files:
        raise FileNotFoundError(
            f"No files matching '{PATTERN}' in '{os.path.abspath(FOLDER)}'. "
            "Run fetch_data.py first to download fund data."
        )
    series = []
    for fp in files:
        name = os.path.splitext(os.path.basename(fp))[0]
        df   = pd.read_excel(fp, header=0)
        if df.empty:
            print(f"[load_prices] skipping {name}: file has no rows")
            continue
        s = pd.Series(
            pd.to_numeric(df.iloc[:, PRICE_COL], errors="coerce").values,
            index=pd.to_datetime(df.iloc[:, DATE_COL], errors="coerce"),
            name=name,
        ).dropna()
        if s.empty:
            print(f"[load_prices] skipping {name}: no valid price data after parsing")
            continue
        series.append(s)
    if not series:
        raise FileNotFoundError(
            f"No usable data found in '{os.path.abspath(FOLDER)}'. "
            "Run fetch_data.py first to download fund data."
        )
    return pd.concat(series, axis=1).sort_index().dropna()


# ─── MONTE CARLO SIMULATION ───────────────────────────────────────────────────
def run_monte_carlo(weights, mu, cov, n_sims=2000, n_days=252,
                    initial_value=10000, seed=42) -> dict:
    """
    Simulates portfolio wealth paths over n_days trading days.
    Uses Cholesky decomposition for correlated daily log-returns.
    Returns percentile fan-chart data, final-value histogram, and key statistics.
    """
    rng   = np.random.default_rng(seed)
    w     = np.array(weights)
    mu_a  = np.array(mu)
    cov_a = np.array(cov)

    mu_daily  = mu_a / 252
    cov_daily = cov_a / 252

    try:
        L = np.linalg.cholesky(cov_daily)
    except np.linalg.LinAlgError:
        L = np.linalg.cholesky(cov_daily + np.eye(len(mu_a)) * 1e-8)

    # Correlated daily log-returns → shape (n_sims, n_days, n_assets)
    z                 = rng.standard_normal((n_sims, n_days, len(mu_a)))
    daily_log_returns = mu_daily + (z @ L.T)

    port_daily   = daily_log_returns @ w                   # (n_sims, n_days)
    cum_log      = np.cumsum(port_daily, axis=1)
    wealth_paths = float(initial_value) * np.exp(cum_log)  # (n_sims, n_days)

    # Subsample days for a lighter payload (every 5 days + final day)
    day_indices = sorted(set(list(range(0, n_days, 5)) + [n_days - 1]))

    # Percentile fan
    pct_levels = [5, 10, 25, 50, 75, 90, 95]
    pct_matrix = np.percentile(wealth_paths, pct_levels, axis=0)

    percentile_paths = {"days": day_indices}
    for idx, p in enumerate(pct_levels):
        percentile_paths[f"p{p}"] = [round(float(pct_matrix[idx, d]), 2) for d in day_indices]

    # Individual path sample for scatter-plot overlay (150 paths × subsampled days)
    n_sample    = min(150, n_sims)
    sample_idx  = rng.choice(n_sims, size=n_sample, replace=False)
    sample_paths = [
        [round(float(wealth_paths[i, d]), 2) for d in day_indices]
        for i in sample_idx
    ]

    # Final-value histogram
    final_vals    = wealth_paths[:, -1]
    counts, edges = np.histogram(final_vals, bins=40)
    histogram = {
        "counts": counts.tolist(),
        "edges":  [round(float(e), 2) for e in edges.tolist()],
    }

    # Key statistics
    mean_final   = float(np.mean(final_vals))
    median_final = float(np.median(final_vals))
    std_final    = float(np.std(final_vals))
    prob_profit  = float(np.mean(final_vals > initial_value))

    var_95_val  = float(np.percentile(final_vals, 5))
    cvar_95_val = float(np.mean(final_vals[final_vals <= var_95_val]))

    med_path     = pct_matrix[3]   # 50th percentile row
    running_max  = np.maximum.accumulate(med_path)
    drawdowns    = (med_path - running_max) / np.where(running_max > 0, running_max, 1)
    max_drawdown = float(np.min(drawdowns))

    return {
        "percentile_paths": percentile_paths,
        "sample_paths":     sample_paths,
        "histogram": histogram,
        "stats": {
            "initial_value":       round(float(initial_value), 2),
            "mean_final":          round(mean_final, 2),
            "median_final":        round(median_final, 2),
            "std_final":           round(std_final, 2),
            "prob_profit":         round(prob_profit * 100, 2),
            "var_95":              round(var_95_val, 2),
            "cvar_95":             round(cvar_95_val, 2),
            "max_drawdown_median": round(max_drawdown * 100, 2),
            "n_simulations":       n_sims,
            "n_days":              n_days,
        },
    }


# ─── CACHE ────────────────────────────────────────────────────────────────────
_cache        = None   # full portfolio response (frontier, GMVP, stats)
_math_cache   = None   # (mu_array, cov_array) for /api/optimal
_prices_cache = None   # raw price DataFrame for /api/fund-overview


def get_portfolio_data() -> dict:
    global _cache, _math_cache, _prices_cache
    if _cache:
        return _cache
    prices        = load_prices()
    _prices_cache = prices
    mu, cov, corr = compute_stats(prices)
    mu_a, cov_a   = mu.values, cov.values
    _math_cache   = (mu_a, cov_a)
    _cache = {
        "fund_names":        list(mu.index),
        "returns":           mu_a.tolist(),
        "std_devs":          np.sqrt(np.diag(cov_a)).tolist(),
        "correlation":       corr.values.tolist(),
        "gmvp_no_short":     solve_gmvp_no_short(mu_a, cov_a),
        "gmvp_short":        solve_gmvp_short(mu_a, cov_a),
        "frontier_no_short": build_frontier(mu_a, cov_a, allow_short=False),
        "frontier_short":    build_frontier(mu_a, cov_a, allow_short=True),
        "frontier_short_myportfolio": build_frontier(
            mu_a, cov_a, allow_short=True,
            max_r=solve_optimal_portfolio(mu_a, cov_a, A=1.0, allow_short=True)["return"] * 1.05,
        ),
    }
    return _cache


def get_math_cache():
    """Returns (mu_array, cov_array), warming the full cache if needed."""
    global _math_cache
    if _math_cache is None:
        get_portfolio_data()
    return _math_cache


# ─── AGGREGATED GETTER FOR FUND OVERVIEW ──────────────────────────────────────
def get_fund_overview() -> dict:
    """
    Returns per-fund statistics and time-series data for frontend visualisations:
      annualised returns, std devs, variances, sharpe ratios, covariance matrix,
      monthly cumulative-return series, 30-day rolling volatility series.
    """
    global _prices_cache
    if _prices_cache is None:
        get_portfolio_data()
    prices = _prices_cache
    mu, cov, corr = compute_stats(prices)
    mu_a  = mu.values
    cov_a = cov.values
    std_a = np.sqrt(np.diag(cov_a))

    monthly = prices.resample("ME").last()
    cum_ret = (monthly / monthly.iloc[0] * 100).round(4)
    dates   = [d.strftime("%Y-%m") for d in cum_ret.index]

    log_ret          = np.log(prices / prices.shift(1)).dropna()
    roll_vol         = log_ret.rolling(30).std() * np.sqrt(252)
    roll_vol_monthly = roll_vol.resample("ME").last().dropna()
    rv_dates         = [d.strftime("%Y-%m") for d in roll_vol_monthly.index]

    fund_names = list(mu.index)
    return {
        "fund_names":    fund_names,
        "returns":       mu_a.tolist(),
        "std_devs":      std_a.tolist(),
        "variances":     np.diag(cov_a).tolist(),
        "sharpe_ratios": [(r / s if s > 0 else 0) for r, s in zip(mu_a, std_a)],
        "covariance":    cov_a.tolist(),
        "correlation":   corr.values.tolist(),
        "cumulative": {
            "dates":  dates,
            "series": {name: cum_ret[name].tolist() for name in fund_names},
        },
        "rolling_vol": {
            "dates":  rv_dates,
            "series": {name: roll_vol_monthly[name].round(4).tolist() for name in fund_names},
        },
    }
