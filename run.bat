@echo off
pip install -r requirements.txt
python train_models.py
python app.py
