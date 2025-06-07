from flask import Flask, request, jsonify
import pandas as pd
from datetime import datetime
from flask_cors import CORS # Import Flask-CORS 
from predictor import predict_future_weather_with_location

app = Flask(__name__)
CORS(app) 

@app.post('/predict')
def predict():
    payload = request.json
    if not payload or 'live' not in payload:
        return jsonify({"error": "Missing 'live' data in payload"}), 400
    live_data_row = payload['live']
    try:
        live_data_row['time'] = pd.to_datetime(live_data_row['time'])
        live_df = pd.DataFrame([live_data_row]).set_index('time')
    except Exception as e:
        return jsonify({"error": f"Failed to parse live data or set index: {e}"}), 400
    num_hours_to_predict = payload.get('hours', 5)
    print(f"Flask received live data for prediction: {live_df.index[0]} - {live_df.iloc[0]['temp']}C. Predicting for {num_hours_to_predict} hours.")

    try:
        preds = predict_future_weather_with_location(
            live_df,
            num_hours_to_predict=num_hours_to_predict
        )
    except Exception as e:
        print(f"Error during prediction in Flask: {e}")
        return jsonify({"error": f"Prediction failed: {e}"}), 500

    # convert pandas timestamps to ISO strings for JSON serialization
    for p in preds:
        if 'time' in p and isinstance(p['time'], (pd.Timestamp, datetime)):
            p['time'] = p['time'].isoformat()
    return jsonify(preds)

if __name__ == '__main__':
    app.run(port=5001, debug=True) # debug=True is useful for development