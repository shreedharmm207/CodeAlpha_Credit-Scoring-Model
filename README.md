# Credit Scoring Model - Financial Risk Classification System

An end-to-end machine learning web application that predicts an individual borrower's creditworthiness from historical financial data.

## Project Structure
- `train_models.py`: Data generation, feature engineering, model training, and evaluation pipeline
- `app.py`: Flask web application and prediction API backend
- `templates/index.html`: Web interface for applicant evaluation and model metrics
- `static/css/style.css`: Responsive financial dashboard styling
- `static/js/script.js`: Interactive form handlers, charts, and confusion matrix explorer
- `data/credit_dataset.csv`: Dataset with financial features and credit labels
- `models/`: Exported scikit-learn models (`.joblib`), scaler, and evaluation metrics (`metrics.json`)
- `requirements.txt`: Python package dependencies
- `run.bat`: Windows quick launcher

## Classification Algorithms
1. Logistic Regression
2. Decision Tree Classifier
3. Random Forest Classifier

## Evaluation Metrics (Out-of-sample Test Data)
- Accuracy
- Precision
- Recall
- F1-Score
- ROC-AUC

## How to Run

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Train the models and generate metrics:
```bash
python train_models.py
```

3. Launch the web application:
```bash
python app.py
```

4. Open browser and visit:
```
http://127.0.0.1:5000
```
