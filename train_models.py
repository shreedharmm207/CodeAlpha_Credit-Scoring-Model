import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

def generate_dataset(num_samples=2500):
    np.random.seed(42)
    
    age = np.random.randint(21, 68, size=num_samples)
    annual_income = np.round(np.random.uniform(22000, 160000, size=num_samples), 2)
    loan_amount = np.round(np.random.uniform(2000, 45000, size=num_samples), 2)
    loan_term_months = np.random.choice([12, 24, 36, 48, 60], size=num_samples)
    credit_history_years = np.round(np.random.uniform(1.0, 22.0, size=num_samples), 1)
    num_open_accounts = np.random.randint(1, 15, size=num_samples)
    num_late_payments = np.random.choice([0, 1, 2, 3, 4, 5], p=[0.55, 0.20, 0.12, 0.07, 0.04, 0.02], size=num_samples)
    credit_utilization_ratio = np.round(np.random.uniform(0.05, 0.95, size=num_samples), 3)
    total_debt = np.round(annual_income * np.random.uniform(0.05, 0.75, size=num_samples), 2)
    
    debt_to_income = np.round(total_debt / annual_income, 3)
    loan_to_income = np.round(loan_amount / annual_income, 3)
    
    raw_score = (
        (annual_income / 10000) * 0.45 +
        (credit_history_years) * 0.35 +
        (num_open_accounts) * 0.10 -
        (debt_to_income * 10) * 0.60 -
        (credit_utilization_ratio * 10) * 0.55 -
        (num_late_payments * 2.2) -
        (loan_to_income * 10) * 0.35 +
        np.random.normal(0, 1.2, size=num_samples)
    )
    
    threshold = np.percentile(raw_score, 35)
    creditworthy = (raw_score >= threshold).astype(int)
    
    df = pd.DataFrame({
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
        "loan_to_income": loan_to_income,
        "creditworthy": creditworthy
    })
    
    return df

def train_and_evaluate():
    os.makedirs("data", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    
    df = generate_dataset()
    df.to_csv("data/credit_dataset.csv", index=False)
    
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
    
    X = df[features]
    y = df["creditworthy"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, "models/scaler.joblib")
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=6, min_samples_split=10, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=120, max_depth=10, random_state=42)
    }
    
    model_files = {
        "Logistic Regression": "models/logistic_regression.joblib",
        "Decision Tree": "models/decision_tree.joblib",
        "Random Forest": "models/random_forest.joblib"
    }
    
    metrics_summary = {}
    
    for name, clf in models.items():
        if name == "Logistic Regression":
            clf.fit(X_train_scaled, y_train)
            y_pred = clf.predict(X_test_scaled)
            y_prob = clf.predict_proba(X_test_scaled)[:, 1]
        else:
            clf.fit(X_train, y_train)
            y_pred = clf.predict(X_test)
            y_prob = clf.predict_proba(X_test)[:, 1]
            
        joblib.dump(clf, model_files[name])
        
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        metrics_summary[name] = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred)), 4),
            "recall": round(float(recall_score(y_test, y_pred)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "confusion_matrix": cm
        }
        
    with open("models/metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=4)
        
    feature_meta = {
        "feature_names": features,
        "dataset_size": len(df),
        "positive_ratio": round(float(df["creditworthy"].mean()), 4)
    }
    with open("models/metadata.json", "w") as f:
        json.dump(feature_meta, f, indent=4)

if __name__ == "__main__":
    train_and_evaluate()
