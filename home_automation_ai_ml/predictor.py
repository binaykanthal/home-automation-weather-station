import joblib
import pandas as pd
from datetime import timedelta
from preprocessing import preprocess_data
from feature_engineer import feature_engineer
from parse_weather_data import fetch_historical_data 

# load artifacts
rf_temp_model           = joblib.load('models/rf_temp_model.pkl')
rf_prcp_model           = joblib.load('models/rf_prcp_model.pkl')
rf_weather_model        = joblib.load('models/rf_weather_model.pkl')
scaler                  = joblib.load('models/scaler.pkl')
label_encoder           = joblib.load('models/label_encoder.pkl')
feature_columns         = joblib.load('models/feature_columns.pkl')


#for single prediction
def predict(df_live_plus_history):
    """
    df_live_plus_history: DataFrame indexed by time, with same columns as training raw.
    Returns dict: {temperature, precipitation, condition}
    """
    df = preprocess_data(df_live_plus_history)
    df = feature_engineer(df)
    X  = scaler.transform(df[feature_columns])
    return {
        'temperature'   : rf_temp_model.predict(X)[-1].item(),   
        'precipitation' : rf_prcp_model.predict(X)[-1].item(),
        'condition'     : label_encoder.inverse_transform(rf_weather_model.predict(X)[-1].reshape(1,))[0]
    }  
    
#for multiple prediction
def predict_future_weather(
    historical_df,
    live_df,
    num_hours_to_predict=5
):
    """
    live_df:  single-row DataFrame of current conditions (indexed by time)
    historical_df: DataFrame of past data (at least 24h) indexed by time
    models/scaler/encoder/feature_columns: your trained artifacts
    returns: list of dicts, one per hour ahead
    """
    # only keep the columns your pipeline expects
    expected_cols = ['temp','dwpt','rhum','prcp','wdir','wspd','pres','coco']
    hist = historical_df[expected_cols].copy()

    # align index name
    live_df.index.name = hist.index.name

    # start forecasting history + live
    forecast_df = pd.concat([hist, live_df])

    
    results = []

    for hour in range(1, num_hours_to_predict + 1):
        # preprocess + feature engineer
        df_p = preprocess_data(forecast_df)
        df_fe = feature_engineer(df_p)

        if df_fe.empty:
            break

        # grab the most recent row of features
        last_features = df_fe.iloc[[-1]][feature_columns]

        # compute next timestamp
        last_time = last_features.index[0]
        next_time = (last_time + timedelta(hours=1)) \
                      .replace(minute=0, second=0, microsecond=0)

        # scale & predict
        X_scaled = scaler.transform(last_features)
        temp_pred = rf_temp_model.predict(X_scaled)[0]
        prcp_pred = rf_prcp_model.predict(X_scaled)[0]
        cond_code = rf_weather_model.predict(X_scaled)[0]
        cond_text = label_encoder.inverse_transform([cond_code])[0]

        # store result
        results.append({
            "time": next_time,
            "predicted_temperature_celsius": float(temp_pred),
            "predicted_rainfall_mm_per_hour": float(prcp_pred),
            "predicted_weather_condition": cond_text
        })

        # append this prediction to forecast_df for next iteration
        new_row = {
            'temp': temp_pred,
            'dwpt': temp_pred - ((100 - hist['rhum'].iloc[-1]) / 5.0),
            'rhum': hist['rhum'].iloc[-1],
            'prcp': prcp_pred,
            'wdir': hist['wdir'].iloc[-1],
            'wspd': hist['wspd'].iloc[-1],
            'pres': hist['pres'].iloc[-1],
            'coco': cond_text
        }
        new_df = pd.DataFrame([new_row], index=[next_time])
        new_df.index.name = forecast_df.index.name
        forecast_df = pd.concat([forecast_df, new_df])

    return results
 
 
def predict_future_weather_with_location(
    live_df,
    num_hours_to_predict=5
):
    """
    live_df:  single-row DataFrame of current conditions (indexed by time)
    historical_df: DataFrame of past data (at least 24h) indexed by time
    models/scaler/encoder/feature_columns: your trained artifacts
    returns: list of dicts, one per hour ahead
    """

    historical_df = fetch_historical_data().iloc[-24:]
    # only keep the columns your pipeline expects
    expected_cols = ['temp','dwpt','rhum','prcp','wdir','wspd','pres','coco']
    hist = historical_df[expected_cols].copy()

    # align index name
    live_df.index.name = hist.index.name

    # start forecasting history + live
    forecast_df = pd.concat([hist, live_df])

    
    results = []

    for hour in range(1, num_hours_to_predict + 1):
        # preprocess + feature engineer
        df_p = preprocess_data(forecast_df)
        df_fe = feature_engineer(df_p)

        if df_fe.empty:
            break

        # grab the most recent row of features
        last_features = df_fe.iloc[[-1]][feature_columns]

        # compute next timestamp
        last_time = last_features.index[0]
        next_time = (last_time + timedelta(hours=1)) \
                      .replace(minute=0, second=0, microsecond=0)

        # scale & predict
        X_scaled = scaler.transform(last_features)
        temp_pred = rf_temp_model.predict(X_scaled)[0]
        prcp_pred = rf_prcp_model.predict(X_scaled)[0]
        cond_code = rf_weather_model.predict(X_scaled)[0]
        cond_text = label_encoder.inverse_transform([cond_code])[0]

        # store result
        results.append({
            "time": next_time,
            "temp": float(temp_pred),
            "prcp": float(prcp_pred),
            "cond": cond_text
        })

        # append this prediction to forecast_df for next iteration
        new_row = {
            'temp': temp_pred,
            'dwpt': temp_pred - ((100 - hist['rhum'].iloc[-1]) / 5.0),
            'rhum': hist['rhum'].iloc[-1],
            'prcp': prcp_pred,
            'wdir': hist['wdir'].iloc[-1],
            'wspd': hist['wspd'].iloc[-1],
            'pres': hist['pres'].iloc[-1],
            'coco': cond_text
        }
        new_df = pd.DataFrame([new_row], index=[next_time])
        new_df.index.name = forecast_df.index.name
        forecast_df = pd.concat([forecast_df, new_df])

    return results
 