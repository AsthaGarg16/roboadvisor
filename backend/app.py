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
    {"id":"q1","weight":2.0,"text":"What is your primary investment goal?",
     "options":[
       {"label":"Maximum capital growth — I want the highest possible returns","score":1},
       {"label":"Growth with some income along the way","score":2},
       {"label":"Balanced mix of growth and capital preservation","score":3},
       {"label":"Steady income with limited exposure to market swings","score":4},
       {"label":"Preserve my capital above all else","score":5},
     ]},
    {"id":"q2","weight":2.5,"text":"How would you react if your portfolio dropped 25% in a single year?",
     "options":[
       {"label":"Buy more — a dip is a buying opportunity","score":1},
       {"label":"Stay the course; I trust the long-term thesis","score":2},
       {"label":"Feel uneasy but hold my positions","score":3},
       {"label":"Sell some holdings to reduce further downside","score":4},
       {"label":"Exit the market and move to cash immediately","score":5},
     ]},
    {"id":"q3","weight":1.5,"text":"How long can you leave your investments untouched?",
     "options":[
       {"label":"More than 15 years","score":1},
       {"label":"10 – 15 years","score":2},
       {"label":"5 – 10 years","score":3},
       {"label":"2 – 5 years","score":4},
       {"label":"Less than 2 years","score":5},
     ]},
    {"id":"q4","weight":1.5,"text":"What share of your total wealth is this portfolio?",
     "options":[
       {"label":"Less than 10% — this is discretionary money","score":1},
       {"label":"10 – 25%","score":2},
       {"label":"25 – 50%","score":3},
       {"label":"50 – 75%","score":4},
       {"label":"More than 75% — this is essentially all I have","score":5},
     ]},
    {"id":"q5","weight":2.0,"text":"Which scenario would you prefer?",
     "options":[
       {"label":"50% chance of +40%, 50% chance of -20%","score":1},
       {"label":"50% chance of +25%, 50% chance of -10%","score":2},
       {"label":"50% chance of +15%, 50% chance of -5%","score":3},
       {"label":"50% chance of +8%,  50% chance of -2%","score":4},
       {"label":"Guaranteed return of +3% with no downside","score":5},
     ]},
    {"id":"q6","weight":1.0,"text":"How familiar are you with financial markets and investing?",
     "options":[
       {"label":"Very experienced — I actively manage my own portfolio","score":1},
       {"label":"Experienced — I understand most financial instruments","score":2},
       {"label":"Moderate — I know the basics of stocks and bonds","score":3},
       {"label":"Beginner — I have limited knowledge of investing","score":4},
       {"label":"No experience — I am new to investing entirely","score":5},
     ]},
    {"id":"q7","weight":1.5,"text":"How stable is your current income?",
     "options":[
       {"label":"Very stable — government job, tenured position, etc.","score":1},
       {"label":"Stable — established career with reliable salary","score":2},
       {"label":"Moderately stable — some variability (e.g., bonus-heavy)","score":3},
       {"label":"Variable — freelance or commission-based income","score":4},
       {"label":"Unstable or no income — unemployed / retired on fixed funds","score":5},
     ]},
    {"id":"q8","weight":1.0,"text":"Do you have an emergency fund covering at least 6 months of expenses?",
     "options":[
       {"label":"Yes, and more — over 12 months covered","score":1},
       {"label":"Yes — roughly 6 – 12 months covered","score":2},
       {"label":"Partially — 3 – 6 months covered","score":3},
       {"label":"Minimal — less than 3 months","score":4},
       {"label":"No emergency fund at all","score":5},
     ]},
]

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
    answers: { "q1": score_int (1–5), ... }

    Formula:
        raw = Σ (weight_i × score_i)      ∈ [W_min, W_max]
        A   = 1 + 9 × (raw − W_min) / (W_max − W_min)   ∈ [1, 10]

    A = 1  → very aggressive
    A = 10 → very conservative
    """
    total_w  = sum(q["weight"] for q in QUESTIONS)
    w_min, w_max = total_w * 1, total_w * 5
    weighted_sum, breakdown = 0.0, []

    for q in QUESTIONS:
        score = int(answers[q["id"]])
        c = q["weight"] * score
        weighted_sum += c
        breakdown.append({"question": q["id"], "weight": q["weight"],
                          "score": score, "contribution": round(c, 4)})

    A = round(max(1.0, min(10.0, 1 + 9 * (weighted_sum - w_min) / (w_max - w_min))), 4)
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


_cache = None   # computed once, reused for all subsequent /api/portfolio calls


def get_portfolio_data():
    global _cache
    if _cache:
        return _cache
    prices       = load_prices()
    mu, cov, corr = compute_stats(prices)
    mu_a, cov_a  = mu.values, cov.values
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
