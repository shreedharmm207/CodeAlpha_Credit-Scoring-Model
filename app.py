import os
import json
import numpy as np
import pandas as pd
import joblib
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

MODELS = {}
SCALER = None
METRICS = {}

def load_resources():
    global MODELS, SCALER, METRICS
    if os.path.exists("models/scaler.joblib"):
        SCALER = joblib.load("models/scaler.joblib")
    
    model_paths = {
        "Logistic Regression": "models/logistic_regression.joblib",
        "Decision Tree": "models/decision_tree.joblib",
        "Random Forest": "models/random_forest.joblib"
    }
    
    for name, path in model_paths.items():
        if os.path.exists(path):
            MODELS[name] = joblib.load(path)
            
    if os.path.exists("models/metrics.json"):
        with open("models/metrics.json", "r") as f:
            METRICS = json.load(f)

load_resources()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    if not METRICS:
        load_resources()
    return jsonify(METRICS)

@app.route("/api/samples", methods=["GET"])
def get_samples():
    samples = {
        "prime": {
            "age": 42,
            "annual_income": 95000,
            "loan_amount": 15000,
            "loan_term_months": 36,
            "credit_history_years": 14.5,
            "num_open_accounts": 7,
            "num_late_payments": 0,
            "credit_utilization_ratio": 0.18,
            "total_debt": 18000,
            "model_choice": "Random Forest"
        },
        "moderate": {
            "age": 29,
            "annual_income": 48000,
            "loan_amount": 14000,
            "loan_term_months": 48,
            "credit_history_years": 5.0,
            "num_open_accounts": 4,
            "num_late_payments": 1,
            "credit_utilization_ratio": 0.48,
            "total_debt": 19000,
            "model_choice": "Random Forest"
        },
        "high_risk": {
            "age": 23,
            "annual_income": 26000,
            "loan_amount": 18000,
            "loan_term_months": 60,
            "credit_history_years": 2.0,
            "num_open_accounts": 8,
            "num_late_payments": 4,
            "credit_utilization_ratio": 0.88,
            "total_debt": 22000,
            "model_choice": "Random Forest"
        }
    }
    return jsonify(samples)

@app.route("/api/predict", methods=["POST"])
def predict():
    if not MODELS or SCALER is None:
        load_resources()
        
    data = request.get_json(force=True)
    
    age = float(data.get("age", 30))
    annual_income = float(data.get("annual_income", 50000))
    loan_amount = float(data.get("loan_amount", 10000))
    loan_term_months = int(data.get("loan_term_months", 36))
    credit_history_years = float(data.get("credit_history_years", 5))
    num_open_accounts = int(data.get("num_open_accounts", 4))
    num_late_payments = int(data.get("num_late_payments", 0))
    credit_utilization_ratio = float(data.get("credit_utilization_ratio", 0.30))
    total_debt = float(data.get("total_debt", 10000))
    model_choice = data.get("model_choice", "Random Forest")
    
    if annual_income <= 0:
        annual_income = 1.0
        
    debt_to_income = round(total_debt / annual_income, 4)
    loan_to_income = round(loan_amount / annual_income, 4)
    
    features = [
        "age",
        "annual_income",
        "loan_amount",
        "loan_term_months",
        "credit_history_years",
        "num_open_accounts",
        "num_late_payments",
        "credit_utilization_ratio",
        "total_debt",
        "debt_to_income",
        "loan_to_income"
    ]
    
    row = pd.DataFrame([{
        "age": age,
        "annual_income": annual_income,
        "loan_amount": loan_amount,
        "loan_term_months": loan_term_months,
        "credit_history_years": credit_history_years,
        "num_open_accounts": num_open_accounts,
        "num_late_payments": num_late_payments,
        "credit_utilization_ratio": credit_utilization_ratio,
        "total_debt": total_debt,
        "debt_to_income": debt_to_income,
        "loan_to_income": loan_to_income
    }])[features]
    
    selected_model = MODELS.get(model_choice, MODELS.get("Random Forest"))
    
    if model_choice == "Logistic Regression":
        row_processed = SCALER.transform(row)
        prediction = int(selected_model.predict(row_processed)[0])
        probability = float(selected_model.predict_proba(row_processed)[0][1])
    else:
        prediction = int(selected_model.predict(row)[0])
        probability = float(selected_model.predict_proba(row)[0][1])
        
    credit_score = int(300 + round(probability * 550))
    
    if credit_score >= 740:
        rating = "Excellent"
        decision = "Approved"
        decision_class = "approved"
    elif credit_score >= 670:
        rating = "Good"
        decision = "Approved"
        decision_class = "approved"
    elif credit_score >= 580:
        rating = "Fair"
        decision = "Conditional Approval / Manual Review"
        decision_class = "review"
    else:
        rating = "Poor"
        decision = "Declined / High Risk"
        decision_class = "declined"
        
    risk_factors = []
    positive_factors = []
    
    if debt_to_income > 0.45:
        risk_factors.append(f"High Debt-to-Income ratio ({round(debt_to_income * 100, 1)}%)")
    else:
        positive_factors.append(f"Healthy Debt-to-Income ratio ({round(debt_to_income * 100, 1)}%)")
        
    if credit_utilization_ratio > 0.50:
        risk_factors.append(f"Elevated Credit Utilization ({round(credit_utilization_ratio * 100, 1)}%)")
    else:
        positive_factors.append(f"Low Credit Utilization ({round(credit_utilization_ratio * 100, 1)}%)")
        
    if num_late_payments > 0:
        risk_factors.append(f"Recorded {num_late_payments} late payment(s)")
    else:
        positive_factors.append("Clean payment track record (0 late payments)")
        
    if credit_history_years >= 7:
        positive_factors.append(f"Established credit history ({credit_history_years} years)")
    elif credit_history_years < 3:
        risk_factors.append(f"Short credit history ({credit_history_years} years)")
        
    if loan_to_income > 0.40:
        risk_factors.append(f"High Loan-to-Income request ({round(loan_to_income * 100, 1)}%)")
        
    response = {
        "model_used": model_choice,
        "prediction": prediction,
        "probability": round(probability, 4),
        "credit_score": credit_score,
        "rating": rating,
        "decision": decision,
        "decision_class": decision_class,
        "debt_to_income": debt_to_income,
        "loan_to_income": loan_to_income,
        "positive_factors": positive_factors,
        "risk_factors": risk_factors
    }
    
    return jsonify(response)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
