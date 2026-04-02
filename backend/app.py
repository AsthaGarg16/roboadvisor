"""
BMD5302 Robot Adviser — Flask Backend
======================================
API Routes:
  GET  /api/questions     → 8 questionnaire questions (no scores exposed)
  POST /api/score         → accepts answers, returns risk aversion A + profile
  GET  /api/portfolio     → efficient frontier, GMVP, fund stats, correlation

DATA SETUP:
  Place your 10 Excel files in the ./data/ folder.
  Each file must have:
    Column 0 → Date  (any parseable date format)
    Column 1 → Price (daily closing / NAV price)
  File name becomes the fund label in the UI.

In dev mode: React (port 5173) calls this Flask server (port 5000).
In production: run `npm run build` inside frontend/, then Flask serves dist/.
"""

import os, glob
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from scipy.optimize import minimize

# ─── CONFIG ──────────────────────────────────────────────────────────────────
FOLDER     = "./data"       # folder containing your 10 Excel (.xlsx) files
PATTERN    = "*.xlsx"       # change to *.xls for legacy files
DATE_COL   = 0              # column index (0-based) for the date
PRICE_COL  = 1              # column index (0-based) for the price
N_FRONTIER = 120            # number of points to trace on each frontier
RF_RATE    = 0.0            # annual risk-free rate (e.g. 0.04 for 4%)

app = Flask(__name__, static_folder="frontend/dist", static_url_path="/")
CORS(app)   # allow all origins so React dev server can call the API

# ─── QUESTIONNAIRE ───────────────────────────────────────────────────────────
QUESTIONS = [
    {"id":"q1","weight":1.0,"text":"What is your primary investment goal?",
     "options":[
       {"label":"Preservation: I prioritize the absolute safety of your initial capital and seek to minimize any risk of nominal loss, accepting that returns may not significantly outperform inflation.","score":1},
       {"label":"Income: I seek a portfolio that generates regular, stable cash flows—such as dividends or interest payments—to support current spending needs while maintaining a conservative risk profile.","score":3},
       {"label":"Growth: I aim for long-term capital appreciation and are willing to accept moderate market fluctuations in exchange for the potential to build significant wealth over time.","score":7},
       {"label":"Aggressive Growth: I pursue maximum capital gains through high-equity exposure and are comfortable with substantial price volatility and the potential for short-term drawdowns in exchange for superior long-term returns.","score":10},
     ]},
    {"id":"q2","weight":1.0,"text":"Which hypothetical portfolio would you choose?",
     "options":[
       {"label":"100% Bond","score":1},
       {"label":"70% Bond, 30% Stock","score":4},
       {"label":"50% Bond, 50% Stock","score":6},
       {"label":"30% Bond, 70% Stock","score":8},
       {"label":"100% Stock","score":10},
     ]},
    {"id":"q3","weight":1.0,"text":"If your portfolio dropped 20% in one month, what would you do?",
     "options":[
       {"label":"Sell All: Liquidate all assets immediately to prevent further capital loss.","score":1},
       {"label":"Sell Some: Reduce portfolio exposure by selling a portion of holdings.","score":3},
       {"label":"Hold: Maintain current positions and wait for a market recovery.","score":7},
       {"label":"Buy More: Capitalize on lower prices by increasing my investment position.","score":10},
     ]},
    {"id":"q4","weight":1.0,"text":"Are you more afraid of losing principal or losing purchasing power?",
     "options":[
       {"label":"Principle Safety is Priority: I prioritize capital preservation over growth and cannot tolerate any loss of my original investment.","score":1},
       {"label":"Balance: I seek a moderate approach that protects my capital while allowing for modest growth to offset rising costs.","score":5},
       {"label":"Beat Inflation: I am more concerned about losing purchasing power and accept market volatility to achieve higher long-term real returns.","score":10},
     ]},
    {"id":"q5","weight":1.0,"text":"What is the most you can tolerate losing in a single year?",
     "options":[
       {"label":"0%","score":1},
       {"label":"5% - 10%","score":4},
       {"label":"10% - 25%","score":7},
       {"label":"> 25%","score":10},
     ]},
    {"id":"q6","weight":1.0,"text":"When do you need to withdraw a significant portion of these funds?",
     "options":[
       {"label":"< 2 years","score":1},
       {"label":"2-5 years","score":4},
       {"label":"5-10 years","score":7},
       {"label":"> 10 years","score":10},
     ]},
     {"id":"q7","weight":1.0,"text":"Which of the following best describes the nature and stability of your primary source of income?",
     "options":[
       {"label":"Unemployed / Retired","score":1},
       {"label":"Commission-based","score":4},
       {"label":"Steady Salary","score":8},
       {"label":"Tenured / Fixed Pension","score":10},
     ]},
     {"id":"q8","weight":1.0,"text":"How long could you cover your essential living expenses using only your existing liquid cash reserves, without selling this portfolio?",
     "options":[
       {"label":"< 1 month","score":1},
       {"label":"1 - 3 months","score":3},
       {"label":"3 - 6 months","score":7},
       {"label":"> 6 months","score":10},
     ]},
     {"id":"q9","weight":1.0,"text":"What is the current level of your fixed financial obligations, including debt repayments and dependents?",
     "options":[
       {"label":"I have significant debt and several dependents requiring financial support.","score":1},
       {"label":"I manage moderate debt levels alongside some ongoing dependent responsibilities.","score":4},
       {"label":"I have minimal debt and few or no financial dependents.","score":8},
       {"label":"I am entirely debt-free with no external financial dependent obligations.","score":10},
     ]},
     {"id":"q10","weight":1.0,"text":"Are you more afraid of losing principal or losing purchasing power?",
     "options":[
       {"label":"My goal is time-critical, and I must withdraw the funds exactly as planned regardless of market conditions.","score":1},
       {"label":"I can delay my goal by one or two years if the market requires time to recover.","score":5},
       {"label":"My goal is opportunistic, allowing me to wait indefinitely for optimal market conditions before withdrawing.","score":10},
     ]},
]

'''
ToDo:
    1. Change to 3 levels in total: Risk Alert, Educational Insight, Risk Profile Aligned
    2. Check how the score here is used, it should not affect U calculation
    3. Change color is needed
'''
PROFILES = [
    (2.0,  "Aggressive",              "#e74c3c",
     "You have a high appetite for risk and pursue maximum returns. Your portfolio will be heavily weighted toward high-growth, volatile assets."),
    (4.0,  "Moderately Aggressive",   "#e67e22",
     "You seek strong growth and tolerate meaningful short-term losses. A growth-tilted portfolio with limited defensive allocation suits you."),
    (6.0,  "Balanced",                "#f1c40f",
     "You want both growth and stability. A balanced portfolio of equities and fixed income fits your profile."),
    (8.0,  "Moderately Conservative", "#2ecc71",
     "Capital preservation is important to you. A portfolio biased toward bonds and defensive assets is recommended."),
    (10.1, "Conservative",            "#3498db",
     "You prioritise keeping your capital safe above all else. Low-volatility instruments and cash equivalents dominate your ideal portfolio."),
]

# ─── RISK AVERSION FORMULA ────────────────────────────────────────────────────
def compute_risk_aversion(answers: dict) -> dict:
    """
    answers: { "q1": score_int, ... }

    Higher questionnaire scores indicate stronger risk appetite.

    Formula:
        raw = Σ (weight_i × score_i)            ∈ [W_min, W_max]
        A   = 1 + 9 × (W_max − raw) / (W_max − W_min)   ∈ [1, 10]

    A = 1  → very aggressive  (high score, strong risk appetite)
    A = 10 → very conservative (low score, low risk appetite)

    In Markowitz utility U = r − (A/2)σ², higher A = more risk averse.
    """
    total_w  = sum(q["weight"] for q in QUESTIONS)
    w_min, w_max = total_w * 1, total_w * 10
    # breakdown records each question's contribution to the final score, in current case (all questions weight 1.0) it's just the score
    # but if we had different weights for different questions, it would show how much each question influenced the final A.
    weighted_sum, breakdown = 0.0, []

    for q in QUESTIONS:
        score = int(answers[q["id"]])
        c = q["weight"] * score
        weighted_sum += c
        breakdown.append({"question": q["id"], "weight": q["weight"],
                          "score": score, "contribution": round(c, 4)})

    A = round(max(1.0, min(10.0, 1 + 9 * (w_max - weighted_sum) / (w_max - w_min))), 4)

    name = col = desc = ""
    for thr, n, c, d in PROFILES:
        if A <= thr: name, col, desc = n, c, d; break

    return {"risk_aversion": A, "profile": name, "colour": col, "description": desc,
            "utility_formula": f"U = r - (σ² × {A}) / 2",
            "raw_weighted_sum": round(weighted_sum, 4), "breakdown": breakdown}

# ─── PORTFOLIO MATH ───────────────────────────────────────────────────────────
def load_prices() -> pd.DataFrame:
    files = sorted(glob.glob(os.path.join(FOLDER, PATTERN)))
    if not files:
        raise FileNotFoundError(
            f"No files matching '{PATTERN}' in '{os.path.abspath(FOLDER)}'. "
            "Add your 10 fund Excel files there."
        )
    series = []
    for fp in files:
        name = os.path.splitext(os.path.basename(fp))[0]
        df   = pd.read_excel(fp, header=0)
        s    = pd.Series(
            pd.to_numeric(df.iloc[:, PRICE_COL], errors="coerce").values,
            index=pd.to_datetime(df.iloc[:, DATE_COL], errors="coerce"),
            name=name,
        ).dropna()
        series.append(s)
    return pd.concat(series, axis=1).sort_index().dropna()


def compute_stats(prices):
    ret  = np.log(prices / prices.shift(1)).dropna()
    return ret.mean() * 252, ret.cov() * 252, ret.corr()


def port_perf(w, mu, cov):
    r = float(w @ mu)
    v = float(w @ cov @ w)
    return r, np.sqrt(max(v, 0))


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
    ci   = np.linalg.inv(cov)
    ones = np.ones(len(mu))
    w    = ci @ ones / (ones @ ci @ ones)
    r, s = port_perf(w, mu, cov)
    return {"weights": w.tolist(), "return": r, "std": s,
            "sharpe": (r - RF_RATE) / s if s > 0 else 0}


def build_frontier(mu, cov, allow_short=False, n=N_FRONTIER):
    k     = len(mu)
    g     = solve_gmvp_short(mu, cov) if allow_short else solve_gmvp_no_short(mu, cov)
    tgts  = np.linspace(g["return"], mu.max() * (1.15 if allow_short else 1.0), n)
    stds, rets = [], []
    for t in tgts:
        res = minimize(lambda w: w @ cov @ w, np.ones(k) / k, method="SLSQP",
                       bounds=None if allow_short else [(0, 1)] * k,
                       constraints=[
                           {"type": "eq", "fun": lambda w: np.sum(w) - 1},
                           {"type": "eq", "fun": lambda w, t=t: w @ mu - t},
                       ],
                       options={"ftol": 1e-12, "maxiter": 800})
        if res.success:
            _, s = port_perf(res.x, mu, cov)
            stds.append(s); rets.append(t)
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


_cache      = None   # computed once, reused for all subsequent /api/portfolio calls
_math_cache = None   # stores (mu_a, cov_a) for /api/optimal


def get_portfolio_data():
    global _cache, _math_cache
    if _cache:
        return _cache
    prices       = load_prices()
    mu, cov, corr = compute_stats(prices)
    mu_a, cov_a  = mu.values, cov.values
    _math_cache  = (mu_a, cov_a)
    _cache = {
        "fund_names":        list(mu.index),
        "returns":           mu_a.tolist(),
        "std_devs":          np.sqrt(np.diag(cov_a)).tolist(),
        "correlation":       corr.values.tolist(),
        "gmvp_no_short":     solve_gmvp_no_short(mu_a, cov_a),
        "gmvp_short":        solve_gmvp_short(mu_a, cov_a),
        "frontier_no_short": build_frontier(mu_a, cov_a, allow_short=False),
        "frontier_short":    build_frontier(mu_a, cov_a, allow_short=True),
    }
    return _cache

# ─── ROUTES ───────────────────────────────────────────────────────────────────
@app.route("/api/questions")
def api_questions():
    return jsonify({"questions": [
        {"id": q["id"], "text": q["text"], "options": [o["label"] for o in q["options"]]}
        for q in QUESTIONS
    ]})


@app.route("/api/score", methods=["POST"])
def api_score():
    body = request.get_json(silent=True)
    if not body or "answers" not in body:
        return jsonify({"error": "Missing 'answers' in request body."}), 400
    ql = {q["id"]: q for q in QUESTIONS}
    score_map = {}
    try:
        for qid, opt_idx in body["answers"].items():
            score_map[qid] = ql[qid]["options"][int(opt_idx)]["score"]
    except (KeyError, IndexError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(compute_risk_aversion(score_map))


@app.route("/api/optimal")
def api_optimal():
    try:
        A_val       = float(request.args.get("A", 5.0))
        allow_short = request.args.get("short", "false").lower() == "true"
        A_val       = max(1.0, min(10.0, A_val))
        if _math_cache is None:
            get_portfolio_data()   # warm the cache
        mu_a, cov_a = _math_cache
        return jsonify(solve_optimal_portfolio(mu_a, cov_a, A_val, allow_short=allow_short))
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/portfolio")
def api_portfolio():
    try:
        return jsonify(get_portfolio_data())
    except FileNotFoundError as e:
        return jsonify({"error": str(e), "hint": "Add your 10 Excel files to the ./data/ folder."}), 404
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# Serve the built React app for all non-API routes (production mode)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    dist = app.static_folder
    if dist and path and os.path.exists(os.path.join(dist, path)):
        return send_from_directory(dist, path)
    if dist and os.path.exists(os.path.join(dist, "index.html")):
        return send_from_directory(dist, "index.html")
    return jsonify({"message": "Run `npm run build` inside frontend/ to serve the React app from Flask."}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n  ╔══════════════════════════════════════════╗")
    print(f"  ║  RoboAdvisor Flask API  →  port {port}     ║")
    print(f"  ║  Data folder: {os.path.abspath(FOLDER):<27}║")
    print(f"  ╚══════════════════════════════════════════╝\n")
    app.run(debug=True, port=port)
