"""
portfolio_optimizer.py
======================
Pure portfolio mathematics: statistics, GMVP solvers, efficient frontier,
and utility-maximising / target-return optimisers.

No I/O, no caching — all functions take plain numpy arrays and return dicts.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize

# ─── CONFIG ──────────────────────────────────────────────────────────────────
N_FRONTIER = 120
RF_RATE    = 0.0


# ─── STATISTICS ───────────────────────────────────────────────────────────────
def compute_stats(prices: pd.DataFrame):
    """Returns (mu_annual, cov_annual, corr) from a daily price DataFrame."""
    ret = np.log(prices / prices.shift(1)).dropna()
    return ret.mean() * 252, ret.cov() * 252, ret.corr()


def port_perf(w, mu, cov):
    """Returns (annualised_return, annualised_std) for weight vector w."""
    r = float(w @ mu)
    v = float(w @ cov @ w)
    return r, np.sqrt(max(v, 0))


# ─── GMVP SOLVERS ─────────────────────────────────────────────────────────────
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


# ─── EFFICIENT FRONTIER ───────────────────────────────────────────────────────
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

    up_stds, up_rets = _sweep(np.linspace(g["return"], max_r, half), g["weights"])
    lo_stds, lo_rets = _sweep(np.linspace(g["return"], min_r, half), g["weights"])

    stds = lo_stds[::-1] + up_stds
    rets = lo_rets[::-1] + up_rets
    return {"std": stds, "ret": rets}


# ─── PORTFOLIO OPTIMISERS ─────────────────────────────────────────────────────
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
    """Find the minimum-variance portfolio for a given target return.

    No-short: target is clamped to [gmvp_return, max(mu)].
    Short allowed: only clamps below gmvp_return; above max(mu) is achievable via
    leverage (long high-return / short low-return).
    """
    n    = len(mu)
    gmvp = solve_gmvp_no_short(mu, cov) if not allow_short else solve_gmvp_short(mu, cov)
    min_r = gmvp["return"]

    clamped = False
    t = target_return
    if t < min_r:
        t, clamped = min_r, True
    elif not allow_short and t > float(np.max(mu)):
        t, clamped = float(np.max(mu)), True

    if abs(t - min_r) < 1e-6:
        return {**gmvp, "target_return": target_return, "clamped": clamped}

    bounds = None if allow_short else [(0, 1)] * n
    res = minimize(
        lambda w: float(w @ cov @ w),
        np.ones(n) / n, method="SLSQP",
        bounds=bounds,
        constraints=[
            {"type": "eq", "fun": lambda w: float(np.sum(w)) - 1},
            {"type": "eq", "fun": lambda w, t=t: float(w @ mu) - t},
        ],
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
