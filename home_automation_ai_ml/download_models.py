import os
import requests

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# Map your model filenames to their Drive IDs
MODELS = {
    'rf_temp_model.pkl'   : '1EGVdXJJAwJbc6d8-hF3nRG-Y_uDf9k8L',
    'rf_prcp_model.pkl'   : '1OgVm91snhHRmi6KsVN5FgU9YNrgud1xw',
    'rf_weather_model.pkl': '1NQ2SdPNhltYyO6Vtw3OLU1UJno4LfNuT',
    'scaler.pkl'          : '1wtlShCMn2YQFJDj1dw1_i07RUFELP_06',
    'label_encoder.pkl'   : '1n5hIXqKchaif-ZMeOVcdqFaJRBhcAHc6',
    'feature_columns.pkl' : '1ffTnwq5OqQLLXOCwIusH4wGVO9fayvud'
}

def download_file(name, file_id):
    local_path = os.path.join(MODEL_DIR, name)
    if os.path.exists(local_path):
        return
    url = f'https://drive.google.com/uc?export=download&id={file_id}'
    print(f"Downloading {name} from Google Drive…")
    r = requests.get(url)
    r.raise_for_status()
    with open(local_path, 'wb') as f:
        f.write(r.content)
    print(f"Saved to {local_path}")

def fetch_all_models():
    for name, fid in MODELS.items():
        download_file(name, fid)

if __name__ == '__main__':
    fetch_all_models()
