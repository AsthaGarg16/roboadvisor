"""
BMD5302 Robot Adviser — Flask Backend
======================================
API Routes:
  GET  /api/questions       → questionnaire questions (no scores exposed)
  POST /api/score           → accepts answers, returns risk aversion A + profile
  GET  /api/portfolio       → efficient frontier, GMVP, fund stats, correlation
  GET  /api/optimal         → optimal portfolio for a given A
  GET  /api/fund-overview   → per-fund stats + time-series for Fund Overview page

DATA SETUP:
  Run `python fetch_data.py` from the backend/ folder to populate ./data/.
  Each .xlsx file must have:
    Column 0 → Date  (any parseable date format)
    Column 1 → Price (daily closing / NAV price)
  File name becomes the fund label in the UI.

In dev mode: React (port 5173) calls this Flask server (port 5000).
In production: run `npm run build` inside frontend/, then Flask serves dist/.
"""

import os
import traceback
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from portfolio_math import (
    get_portfolio_data,
    get_math_cache,
    get_fund_overview,
    solve_optimal_portfolio,
)

app = Flask(__name__, static_folder="frontend/dist", static_url_path="/")
CORS(app)

# ─── QUESTIONNAIRE ───────────────────────────────────────────────────────────
QUESTIONS = [
    {"id":"q1","weight":1.0,"text":"What is your primary investment goal?",
     "options":[
       {"label":"Preservation:  I prioritize capital safety and aim to minimize loss, accepting that returns may only keep pace with inflation.","score":1},
       {"label":"Income: Income: I seek stable cash flow from investments while maintaining a conservative level of risk.","score":3},
       {"label":"Growth: I aim for long-term capital appreciation and accept moderate fluctuations for higher returns.","score":7},
       {"label":"Aggressive Growth: I target maximum returns and accept high volatility and potential short-term losses.","score":10},
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
         {"label": "Principle Safety: I prioritize preserving my principal and cannot tolerate losses.", "score": 1},
         {"label": "Balance: I seek to protect my capital while allowing modest growth to offset rising costs.","score": 5},
         {"label": "Beat Inflation: I prioritize maintaining purchasing power and accept market volatility for higher long-term returns.","score": 10},
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
       {"label":"3 - 12 months","score":7},
       {"label":"> 12 months","score":10},
     ]},
     {"id":"q9","weight":1.0,"text":"What is the current level of your fixed financial obligations, including debt repayments and dependents?",
     "options":[
       {"label":"I have significant debt and several dependents requiring financial support.","score":1},
       {"label":"I manage moderate debt levels alongside some ongoing dependent responsibilities.","score":4},
       {"label":"I have minimal debt and few or no financial dependents.","score":8},
       {"label":"I am entirely debt-free with no external financial dependent obligations.","score":10},
     ]},
     {"id": "q10", "weight": 1.0, "text": "How flexible is your investment goal timing if markets decline?",
     "options":[
       {"label":"My goal is time-critical, and I must withdraw the funds exactly as planned regardless of market conditions.","score":1},
       {"label":"I can delay my goal by one or two years if the market requires time to recover.","score":5},
       {"label":"My goal is opportunistic, allowing me to wait indefinitely for optimal market conditions before withdrawing.","score":10},
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

# ─── RISK AVERSION ───────────────────────────────────────────────────────────
def compute_risk_aversion(answers: dict) -> dict:
    rw, rc = [], []
    for q in QUESTIONS:
        score = int(answers[q["id"]])
        if q["id"] in ["q1", "q2", "q3", "q4", "q5"]:
            rw.append(score)
        else:
            rc.append(score)

    rw_scores = round(sum(rw) / len(rw), 4)
    rc_scores = round(sum(rc) / len(rc), 4)
    final_scores = (rw_scores + rc_scores) / 2
    delta = round(rw_scores - rc_scores, 4)

    A = round(11 - final_scores, 4)

    if delta >= 2.0:
        message     = "Risk Alert"
        explanation = (
            "Your subjective willingness to take risk exceeds your objective financial capacity. "
            "To ensure your long-term solvency, the system has capped your risk profile at your maximum financial ability."
        )
    elif delta <= -2.0:
        message     = "Educational Insight"
        explanation = (
            "Your objective financial capacity is significantly higher than your stated willingness to take risk. "
            "While your portfolio remains conservative for your comfort, please be aware that excessive caution "
            "may prevent you from achieving long-term capital growth and outperforming inflation."
        )
    else:
        message     = "Risk Profile Aligned"
        explanation = (
            "Your investment attitude is well-synchronized with your objective financial capacity. "
            "Your portfolio is optimized for both psychological comfort and financial stability."
        )

    name = col = desc = ""
    for thr, n, c, d in PROFILES:
        if A <= thr:
            name, col, desc = n, c, d
            break

    return {
        "risk_aversion":    A,
        "profile":          name,
        "colour":           col,
        "description":      desc,
        "utility_formula":  f"U = r - (σ² × {A}) / 2",
        "risk_willingness": rw_scores,
        "risk_capability":  rc_scores,
        "final_risk_score": final_scores,
        "delta":            delta,
        "assessment":       message,
        "explanation":      explanation,
    }


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
    ql        = {q["id"]: q for q in QUESTIONS}
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
        return jsonify({"error": str(e), "hint": "Run `python fetch_data.py` in backend/ to download data."}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/optimal")
def api_optimal():
    try:
        A_val       = float(request.args.get("A", 5.0))
        allow_short = request.args.get("short", "false").lower() == "true"
        A_val       = max(1.0, min(10.0, A_val))
        mu_a, cov_a = get_math_cache()
        return jsonify(solve_optimal_portfolio(mu_a, cov_a, A_val, allow_short=allow_short))
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/fund-overview")
def api_fund_overview():
    """
    Returns per-fund statistics and time-series data for the Fund Overview page.
    Includes: returns, std devs, variances, sharpe ratios, covariance matrix,
              correlation matrix, cumulative price series, rolling volatility series.
    """
    try:
        return jsonify(get_fund_overview())
    except FileNotFoundError as e:
        return jsonify({"error": str(e), "hint": "Run `python fetch_data.py` in backend/ to download data."}), 404
    except Exception as e:
        traceback.print_exc()
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
    port = int(os.environ.get("PORT", 5001))
    print(f"\n  ╔══════════════════════════════════════════╗")
    print(f"  ║  RoboAdvisor Flask API  →  port {port}     ║")
    print(f"  ╚══════════════════════════════════════════╝\n")
    app.run(debug=True, port=port)
