"""
portfolio_math.py
=================
All portfolio mathematics extracted from app.py.
Imported by app.py — routes stay in app.py, math lives here.
"""

import os, glob
import numpy as np
import pandas as pd
from scipy.optimize import minimize

# ─── CONFIG ──────────────────────────────────────────────────────────────────
FOLDER     = "./data"
PATTERN    = "*.xlsx"
DATE_COL   = 0
PRICE_COL  = 1
N_FRONTIER = 120
RF_RATE    = 0.0

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
        s    = pd.Series(
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


# ─── STATISTICS ───────────────────────────────────────────────────────────────
def compute_stats(prices: pd.DataFrame):
    """Returns (mu_annual, cov_annual, corr)."""
    ret = np.log(prices / prices.shift(1)).dropna()
    return ret.mean() * 252, ret.cov() * 252, ret.corr()


def port_perf(w, mu, cov):
    r = float(w @ mu)
    v = float(w @ cov @ w)
    return r, np.sqrt(max(v, 0))


# ─── OPTIMISERS ───────────────────────────────────────────────────────────────
def solve_gmvp_no_short(mu, cov):
    n = len(mu)
    res = minimize(lambda w: w @ cov @ w, np.ones(n) / n, method="SLSQP",
                   bounds=[(0, 1)] * n,
                   constraints={"type": "eq", "fun": lambda w: np.sum(w) - 1},
                   options={"ftol": 1e-12, "maxiter": 1000})
    r, s = port_perf(res.x, mu, cov)
    return {"weights": res.x.tolist(), "return": r, "std": s,
            "sharpe": (r - RF_RATE) / s if s > 0 else 0}


def solve_gmvp_short(mu, cov):
    try:
        ci = np.linalg.inv(cov)
    except np.linalg.LinAlgError:
        ci = np.linalg.inv(cov + np.eye(len(mu)) * 1e-6)
    ones = np.ones(len(mu))
    w    = ci @ ones / (ones @ ci @ ones)
    r, s = port_perf(w, mu, cov)
    return {"weights": w.tolist(), "return": r, "std": s,
            "sharpe": (r - RF_RATE) / s if s > 0 else 0}


def build_frontier(mu, cov, allow_short=False, n=N_FRONTIER, max_r=None):
    """
    Constructs the full Markowitz bullet with two warm-started passes:
      1. GMVP → max_return  (efficient upper arm)
      2. GMVP → min_return  (inefficient lower arm, reversed so warm-start stays close)
    This ensures both arms converge reliably under long-only constraints.
    """
    k      = len(mu)
    g      = solve_gmvp_short(mu, cov) if allow_short else solve_gmvp_no_short(mu, cov)
    spread = mu.max() - mu.min()
    min_r  = g["return"] - spread * 1.5 if allow_short else mu.min()
    if max_r is None:
        max_r = mu.max() * (1.3 if allow_short else 1.0)
    bounds = None if allow_short else [(0, 1)] * k
    half   = n // 2

    def _sweep(targets, w_start):
        stds, rets, w0 = [], [], np.array(w_start)
        for t in targets:
            res = minimize(
                lambda w: w @ cov @ w, w0, method="SLSQP",
                bounds=bounds,
                constraints=[
                    {"type": "eq", "fun": lambda w: np.sum(w) - 1},
                    {"type": "eq", "fun": lambda w, t=t: w @ mu - t},
                ],
                options={"ftol": 1e-12, "maxiter": 1000},
            )
            if res.success:
                _, s = port_perf(res.x, mu, cov)
                stds.append(s)
                rets.append(t)
                w0 = res.x
        return stds, rets

    # Upper arm: GMVP → max_r
    up_stds, up_rets = _sweep(np.linspace(g["return"], max_r, half), g["weights"])
    # Lower arm: GMVP → min_r (sweep reversed so warm-start descends from GMVP)
    lo_stds, lo_rets = _sweep(np.linspace(g["return"], min_r, half), g["weights"])

    # Combine: lower arm reversed + upper arm (gives continuous left-to-right ordering)
    stds = lo_stds[::-1] + up_stds
    rets = lo_rets[::-1] + up_rets
    return {"std": stds, "ret": rets}


def solve_optimal_portfolio(mu, cov, A, allow_short=False):
    """Maximise U = w'μ − (A/2)·w'Σw  subject to Σw = 1 (and w ≥ 0 if no short)."""
    n = len(mu)
    def neg_utility(w):
        return (A / 2) * float(w @ cov @ w) - float(w @ mu)
    bounds = None if allow_short else [(0, 1)] * n
    res = minimize(
        neg_utility, np.ones(n) / n, method="SLSQP",
        bounds=bounds,
        constraints={"type": "eq", "fun": lambda w: np.sum(w) - 1},
        options={"ftol": 1e-12, "maxiter": 1000},
    )
    r, s = port_perf(res.x, mu, cov)
    return {
        "weights": res.x.tolist(),
        "return":  r,
        "std":     s,
        "sharpe":  (r - RF_RATE) / s if s > 0 else 0,
        "utility": round(float(r - (A / 2) * s ** 2), 6),
    }


def solve_portfolio_for_return(mu, cov, target_return, allow_short=False):
    """Find the minimum-variance portfolio on the efficient frontier for a given target return.

    No-short: target is clamped to [gmvp_return, max(mu)] — hard constraint.
    Short allowed: only clamps below gmvp_return; above max(mu) is achievable via
    leverage (long high-return / short low-return), so we attempt the exact target.
    """
    n = len(mu)
    gmvp = solve_gmvp_no_short(mu, cov) if not allow_short else solve_gmvp_short(mu, cov)
    min_r = gmvp["return"]

    clamped = False
    t = target_return
    if t < min_r:
        t = min_r
        clamped = True
    elif not allow_short and t > float(np.max(mu)):
        t = float(np.max(mu))
        clamped = True

    if abs(t - min_r) < 1e-6:
        return {**gmvp, "target_return": target_return, "clamped": clamped}

    bounds = None if allow_short else [(0, 1)] * n
    constraints = [
        {"type": "eq", "fun": lambda w: float(np.sum(w)) - 1},
        {"type": "eq", "fun": lambda w, t=t: float(w @ mu) - t},
    ]
    res = minimize(
        lambda w: float(w @ cov @ w),
        np.ones(n) / n, method="SLSQP",
        bounds=bounds, constraints=constraints,
        options={"ftol": 1e-12, "maxiter": 1000},
    )
    r, s = port_perf(res.x, mu, cov)
    return {
        "weights": res.x.tolist(),
        "return": r,
        "std": s,
        "sharpe": (r - RF_RATE) / s if s > 0 else 0,
        "target_return": target_return,
        "clamped": clamped,
    }


# ─── CACHE + AGGREGATED GETTER ────────────────────────────────────────────────
_cache      = None   # full portfolio response (frontier, GMVP, stats)
_math_cache = None   # (mu_array, cov_array) for /api/optimal
_prices_cache = None # raw price DataFrame for /api/fund-overview


def get_portfolio_data() -> dict:
    global _cache, _math_cache, _prices_cache
    if _cache:
        return _cache
    prices          = load_prices()
    _prices_cache   = prices
    mu, cov, corr   = compute_stats(prices)
    mu_a, cov_a     = mu.values, cov.values
    _math_cache     = (mu_a, cov_a)
    _cache = {
        "fund_names":        list(mu.index),
        "returns":           mu_a.tolist(),
        "std_devs":          np.sqrt(np.diag(cov_a)).tolist(),
        "correlation":       corr.values.tolist(),
        "gmvp_no_short":     solve_gmvp_no_short(mu_a, cov_a),
        "gmvp_short":        solve_gmvp_short(mu_a, cov_a),
        "frontier_no_short":          build_frontier(mu_a, cov_a, allow_short=False),
        "frontier_short":             build_frontier(mu_a, cov_a, allow_short=True),
        "frontier_short_myportfolio": build_frontier(mu_a, cov_a, allow_short=True,
                                          max_r=solve_optimal_portfolio(mu_a, cov_a, A=1.0, allow_short=True)["return"] * 1.05),
    }
    return _cache


def get_math_cache():
    """Returns (mu_array, cov_array), warming the cache if needed."""
    global _math_cache
    if _math_cache is None:
        get_portfolio_data()
    return _math_cache


def get_fund_overview() -> dict:
    """
    Returns per-fund statistics and time-series data for frontend visualisations:
      - fund_names
      - annualised returns, std devs, variances, sharpe ratios
      - full covariance matrix
      - monthly price series (for cumulative return line chart)
      - 30-day rolling volatility series (annualised)
    """
    global _prices_cache
    if _prices_cache is None:
        get_portfolio_data()   # warms _prices_cache as a side-effect
    prices = _prices_cache
    mu, cov, corr = compute_stats(prices)
    mu_a   = mu.values
    cov_a  = cov.values
    std_a  = np.sqrt(np.diag(cov_a))

    # Monthly resampled prices → cumulative return indexed to 100
    monthly = prices.resample("ME").last()
    cum_ret = (monthly / monthly.iloc[0] * 100).round(4)
    dates   = [d.strftime("%Y-%m") for d in cum_ret.index]

    # 30-day rolling volatility (annualised), resampled monthly for a lighter payload
    log_ret  = np.log(prices / prices.shift(1)).dropna()
    roll_vol = log_ret.rolling(30).std() * np.sqrt(252)
    roll_vol_monthly = roll_vol.resample("ME").last().dropna()
    rv_dates = [d.strftime("%Y-%m") for d in roll_vol_monthly.index]

    fund_names = list(mu.index)
    return {
        "fund_names":   fund_names,
        "returns":      mu_a.tolist(),
        "std_devs":     std_a.tolist(),
        "variances":    np.diag(cov_a).tolist(),
        "sharpe_ratios": [(r / s if s > 0 else 0) for r, s in zip(mu_a, std_a)],
        "covariance":   cov_a.tolist(),
        "correlation":  corr.values.tolist(),
        # Cumulative price series: { dates: [...], series: { FUND: [...] } }
        "cumulative": {
            "dates":  dates,
            "series": {name: cum_ret[name].tolist() for name in fund_names},
        },
        # Rolling volatility series: { dates: [...], series: { FUND: [...] } }
        "rolling_vol": {
            "dates":  rv_dates,
            "series": {name: roll_vol_monthly[name].round(4).tolist() for name in fund_names},
        },
    }
