import pandas as pd
import numpy as np
from meteostat import Hourly, Point
from datetime import datetime, timedelta
import requests
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import joblib 

kolkata = Point(22.5726, 88.3639, 5)
end_date = datetime.now()
start_date = datetime(end_date.year - 4, end_date.month, end_date.day)
print(f"Fetching daily weather data for Kolkata from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
data = Hourly(kolkata, start_date, end_date)
df = data.fetch()
df.index.name = 'time'
print(f"Successfully acquired {df.shape} historical records.")
print(df.columns)
df = pd.DataFrame(df)
df = df.drop(['snow','tsun','wpgt'],axis=1)
output_file = 'kolkata_weather_data_4.csv'
df.to_csv(output_file)
print(f"\nData saved to {output_file}")
print("\n Download completed")
WEATHER_API_KEY = 'b54d480e27c44af6a5f133554250405' 
BASE_URL = 'https://api.weatherapi.com/v1/'
CITY = 'Kolkata'

def get_current_weather(api_key, city):
  url = f"{BASE_URL}current.json?key={api_key}&q={city}&aqi=no" 
  try:
        response = requests.get(url)
        response.raise_for_status()  
        data = response.json()

        if "error" in data:
            print(f"Error fetching live data: {data['error']['message']}")
            return None
        live_data = {
            'time': (f"{data['location']['localtime']}:00"),
            'temp': data['current']['temp_c'],
            'dwpt': data['current']['dewpoint_c'], 
            'rhum': data['current']['humidity'],
            'prcp': data['current']['precip_mm'], 
            'wdir': data['current']['wind_degree'],
            'wspd': data['current']['wind_kph'], 
            'pres': data['current']['pressure_mb'],
            'coco': data['current']['condition']['text']
        }
        
        live_df = pd.DataFrame([live_data]).set_index('time')
        print("Successfully fetched live data.")
        return live_df
        
  except requests.exceptions.RequestException as e:
        print(f"Error during API request: {e}")
        return None

def read_historical_data(filename):
  df = pd.read_csv(filename) 
  df = df.set_index('time') 
  df = df.drop_duplicates() 
  print(f"Successfully acquired {df.shape} historical records.")
  print(df.columns)
  return df

def preprocess_data(df):
    print("Starting data preprocessing...")
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    numerical_cols = ['temp', 'dwpt', 'rhum', 'prcp', 'wdir', 'wspd', 'pres']
    for col in numerical_cols:
        if col in df.columns:
            df[col] = df[col].interpolate(method='time', limit_direction='both')
            if col in ['prcp']: 
                df[col] = df[col].fillna(0.0)
            else: 
                df[col] = df[col].fillna(df[col].mean())
    
    if 'dwpt' not in df.columns or df['dwpt'].isnull().any():
        print("Calculating dew point from temperature and relative humidity...")
        if 'temp' in df.columns and 'rhum' in df.columns:
            df['dwpt'] = df['temp'] - ((100 - df['rhum']) / 5.0)
        else:
            print("Warning: 'temp' or 'rhum' missing, cannot calculate dew point.")
            df['dwpt'] = df['dwpt'].fillna(df['dwpt'].mean() if 'dwpt' in df.columns else 0.0) 

    def map_weather_condition_to_category(condition_value):

        if isinstance(condition_value, (int, float)) and not pd.isna(condition_value):
            code = int(condition_value)
            if code in [1, 2]: return 'Clear' 
            elif code in [3, 4]: return 'Clouds' 
            elif code in [5, 6]: return 'Haze' 
            elif code in [7, 8, 9]: return 'Rain' 
            elif code in [10, 11]: return 'Freezing Rain' 
            elif code in [12, 13]: return 'Sleet' 
            elif code in [14, 15, 16]: return 'Snow' 
            elif code in [17, 18]: return 'Rain Shower'
            elif code in [19, 20]: return 'Sleet Shower'
            elif code in [21, 22]: return 'Snow Shower'
            elif code in [23, 24]: return 'Lightning'
            elif code in [25, 26, 27]: return 'Thunderstorm'
            else: return 'Other'


        elif isinstance(condition_value, str):
            text = condition_value.lower()
            if 'thunder' in text: return 'Thunderstorm'
            elif 'drizzle' in text: return 'Drizzle'
            elif 'rain' in text and 'shower' in text: return 'Rain Shower'
            elif 'rain' in text: return 'Rain'
            elif 'freezing' in text: return 'Freezing Rain'
            elif 'sleet' in text: return 'Sleet'
            elif 'snow' in text and 'shower' in text: return 'Snow Shower'
            elif 'snow' in text: return 'Snow'
            elif 'clear' in text: return 'Clear'
            elif 'cloud' in text or 'overcast' in text: return 'Clouds'
            elif 'mist' in text or 'fog' in text or 'haze' in text or 'smoke' in text or 'sand' in text or 'dust' in text: return 'Fog'
            else: return 'Other'
        
        return 'Unknown' 
    if 'coco' in df.columns:
        df['weather_condition_category'] = df['coco'].apply(map_weather_condition_to_category)
    else:
        print("Warning: 'coco' column not found for weather condition mapping. Classification target will be 'Unknown'.")
        df['weather_condition_category'] = 'Unknown' 

    print("Data preprocessing complete.")
    return df
    
def feature_engineer(df):
    print("Starting feature engineering...")
    df_fe = df.copy()
 
    df_fe['hour'] = df_fe.index.hour
    df_fe['day_of_week'] = df_fe.index.dayofweek
    df_fe['day_of_year'] = df_fe.index.dayofyear
    df_fe['month'] = df_fe.index.month
    df_fe['year'] = df_fe.index.year
 
    lag_cols = ['temp', 'rhum', 'prcp', 'wspd', 'pres', 'dwpt', 'wdir'] 
    for col in lag_cols:
        if col in df_fe.columns:
            df_fe[f'{col}_lag1'] = df_fe[col].shift(1)
            df_fe[f'{col}_lag24'] = df_fe[col].shift(24) 
            
    rolling_cols = ['temp', 'rhum', 'prcp', 'wspd', 'pres', 'dwpt']
    for col in rolling_cols:
        if col in df_fe.columns:
            df_fe[f'{col}_roll_mean24'] = df_fe[col].rolling(window=24, min_periods=1).mean()
            df_fe[f'{col}_roll_std24'] = df_fe[col].rolling(window=24, min_periods=1).std()
            
    initial_rows = df_fe.shape
    df_fe = df_fe.dropna()
   
    print("Feature engineering complete.")
    return df_fe
    
def train_models(data_features):
    print("Starting model training and evaluation...")

    temp_target = 'temp'
    prcp_target = 'prcp'
    weather_condition_target = 'weather_condition_category'

    features = [col for col in data_features.columns if col not in [temp_target, prcp_target, 'coco', weather_condition_target]]
    
    X = data_features[features]
    y_temp = data_features[temp_target]
    y_prcp = data_features[prcp_target]
    y_weather = data_features[weather_condition_target]
 
    label_encoder = LabelEncoder()
    y_weather_encoded = label_encoder.fit_transform(y_weather)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
    
    split_point = int(len(X_scaled_df) * 0.8)
    X_train, X_test = X_scaled_df.iloc[:split_point], X_scaled_df.iloc[split_point:]
    y_temp_train, y_temp_test = y_temp.iloc[:split_point], y_temp.iloc[split_point:]
    y_prcp_train, y_prcp_test = y_prcp.iloc[:split_point], y_prcp.iloc[split_point:]
    y_weather_train, y_weather_test = y_weather_encoded[:split_point], y_weather_encoded[split_point:]
    
    print(f"Training data size: {len(X_train)} records.")
    print(f"Testing data size: {len(X_test)} records.")
     
    rf_temp_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    rf_temp_model.fit(X_train, y_temp_train)

    rf_prcp_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    rf_prcp_model.fit(X_train, y_prcp_train)

    rf_weather_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf_weather_model.fit(X_train, y_weather_train)
    
    print("\n--- Model Evaluation Results ---")
    y_temp_pred = rf_temp_model.predict(X_test)
    mse_temp = mean_squared_error(y_temp_test, y_temp_pred)
    r2_temp = r2_score(y_temp_test, y_temp_pred)
    print(f"Temperature Prediction (Random Forest Regressor):")
    print(f"  Mean Squared Error (MSE): {mse_temp:.2f}") 
    print(f"  R-squared (R2): {r2_temp:.2f}") 
    

    y_prcp_pred = rf_prcp_model.predict(X_test)
    mse_prcp = mean_squared_error(y_prcp_test, y_prcp_pred)
    r2_prcp = r2_score(y_prcp_test, y_prcp_pred)
    print(f"\nRainfall Prediction (Random Forest Regressor):")
    print(f"  Mean Squared Error (MSE): {mse_prcp:.2f}")
    print(f"  R-squared (R2): {r2_prcp:.2f}")
    

    y_weather_pred = rf_weather_model.predict(X_test)
    accuracy_weather = accuracy_score(y_weather_test, y_weather_pred)
    print(f"\nWeather Condition Prediction (Random Forest Classifier):")
    print(f"  Accuracy: {accuracy_weather:.2f}") 
    print("  Classification Report (Precision, Recall, F1-Score per class):")
    print(classification_report(y_weather_test, y_weather_pred, target_names=label_encoder.classes_)) 
    
    joblib.dump(rf_temp_model, 'rf_temp_model.pkl')
    joblib.dump(rf_prcp_model, 'rf_prcp_model.pkl')
    joblib.dump(rf_weather_model, 'rf_weather_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    joblib.dump(label_encoder, 'label_encoder.pkl')
    joblib.dump(X.columns, 'feature_columns.pkl') 
    
    print("\nModels, scaler, label encoder, and feature columns saved to.pkl files.")
    
    return rf_temp_model, rf_prcp_model, rf_weather_model, scaler, label_encoder, X.columns


print("\n1. Acquiring historical data from Meteostat...")
historical_df = read_historical_data('kolkata_weather_data_4.csv') 
if historical_df.empty:
    print("Failed to acquire historical data. Please check station ID, dates, or network connection.")
print("Historical data sample (first 5 rows):")
print(historical_df.head())
print(f"Historical data columns: {historical_df.columns.tolist()}")


print("\n2. Preprocessing historical data...")
preprocessed_historical_df = preprocess_data(historical_df)
print("Preprocessed historical data sample (first 5 rows):")
print(preprocessed_historical_df.head())

print("\n3. Engineering features for historical data...")
data_features = feature_engineer(preprocessed_historical_df)
print(f"Features engineered. Data shape: {data_features.shape}")
print(f"Feature engineered data columns: {data_features.columns.tolist()}")

print("\n4. Training and evaluating AI/ML models...")
rf_temp_model, rf_prcp_model, rf_weather_model, scaler, label_encoder, feature_columns = train_models(data_features)
print("Model training and evaluation complete. Models saved.")

def predict_future_weather(live_data_json, historical_data_for_lags,
                           rf_temp_model, rf_prcp_model, rf_weather_model,
                           scaler, label_encoder, feature_columns, num_hours_to_predict=5):
  
    print(f"\nPreparing live data for {num_hours_to_predict}-hour prediction...")
    expected_historical_cols = ['temp', 'dwpt', 'rhum', 'prcp', 'wdir', 'wspd', 'pres', 'coco']
    historical_data_for_lags_aligned = historical_data_for_lags[expected_historical_cols]
    live_data_json.index.name = historical_data_for_lags_aligned.index.name
    forecast_history_df = pd.concat([historical_data_for_lags_aligned, live_data_json])
    
    all_future_predictions = []

    for i in range(1, num_hours_to_predict + 1):
        print(f"Predicting for hour +{i}...")
        
        preprocessed_forecast_df = preprocess_data(forecast_history_df)
        features_engineered_forecast_df = feature_engineer(preprocessed_forecast_df)

        if features_engineered_forecast_df.empty:
            print(f"Warning: Feature engineering for hour +{i} resulted in an empty DataFrame. Cannot predict further.")
            break 
            
        current_hour_features = features_engineered_forecast_df.iloc[[-1]][feature_columns]
        current_hour_time = current_hour_features.index[0] 
  
        next_hour_time = (current_hour_time + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        print(f"  Predicting for time: {next_hour_time.strftime('%Y-%m-%d %H:%M:%S')}...")

        current_hour_features_scaled = scaler.transform(current_hour_features)
        
        predicted_temp = rf_temp_model.predict(current_hour_features_scaled)[0] 
        predicted_prcp = rf_prcp_model.predict(current_hour_features_scaled)[0] 
        predicted_weather_encoded = rf_weather_model.predict(current_hour_features_scaled)[0] 
        predicted_weather_condition = label_encoder.inverse_transform([predicted_weather_encoded])[0] 
        

        all_future_predictions.append({
            "time": next_hour_time,
            "predicted_temperature_celsius": predicted_temp,
            "predicted_rainfall_mm_per_hour": predicted_prcp,
            "predicted_weather_condition": predicted_weather_condition
        })

        next_hour_data_for_history = {
            'temp': predicted_temp,
            
            'rhum': forecast_history_df['rhum'].iloc[-1], 
            'prcp': predicted_prcp,
            'wdir': forecast_history_df['wdir'].iloc[-1], 
            'wspd': forecast_history_df['wspd'].iloc[-1], 
            'pres': forecast_history_df['pres'].iloc[-1], 
            'coco': predicted_weather_condition 
        }
        next_hour_data_for_history['dwpt'] = next_hour_data_for_history['temp'] - ((100 - next_hour_data_for_history['rhum']) / 5.0)

        next_hour_df_for_history = pd.DataFrame([next_hour_data_for_history], index=[next_hour_time])
        next_hour_df_for_history.index.name = forecast_history_df.index.name 

        forecast_history_df = pd.concat([forecast_history_df, next_hour_df_for_history])
        
    return all_future_predictions
    
def run_weather_prediction_workflow():
    print("--- Starting AI/ML Weather Prediction Model Development Workflow ---")

    print("\n--- Demonstrating Live Prediction (Next 5 Hours) ---")
    
    city = input('Enter City Name: ')

    live_data_json_response = get_current_weather(WEATHER_API_KEY, city)
    if live_data_json_response is None or live_data_json_response.empty:
        print("Failed to get live data for prediction. Exiting demonstration.")
    else:
        recent_historical_for_lags = preprocessed_historical_df.iloc[-24:] 
        print("\nHistorical data sample for lags (last 5 rows):")
        print(recent_historical_for_lags.tail()) 

        print(f"\nMaking predictions for live weather data for the next 5 hours at {city}...")
        future_predictions = predict_future_weather(
            live_data_json_response, 
            recent_historical_for_lags,
            rf_temp_model, rf_prcp_model, rf_weather_model,
            scaler, label_encoder, feature_columns,
            num_hours_to_predict=5 
        )

        print(f"\n--- Future Weather Predictions (Next 5 Hours) at {city} ---")
        if future_predictions:
            for pred in future_predictions:

                formatted_time = pred['time'].strftime('%Y-%m-%d %H:%M')

                predicted_temp_scalar = pred['predicted_temperature_celsius'] if isinstance(pred['predicted_temperature_celsius'], (int, float, np.floating)) else pred['predicted_temperature_celsius'][0]
                predicted_prcp_scalar = pred['predicted_rainfall_mm_per_hour'] if isinstance(pred['predicted_rainfall_mm_per_hour'], (int, float, np.floating)) else pred['predicted_rainfall_mm_per_hour'][0]
                predicted_condition_scalar = pred['predicted_weather_condition'] if isinstance(pred['predicted_weather_condition'], str) else pred['predicted_weather_condition'][0]

                print(f"  Time: {formatted_time}")
                print(f"    Predicted Temperature: {predicted_temp_scalar:.2f} °C")
                print(f"    Predicted Rainfall: {predicted_prcp_scalar:.2f} mm/h")
                print(f"    Predicted Weather Condition: {predicted_condition_scalar}")
        else:
            print("No future predictions were generated.")

if __name__ == "__main__":
    run_weather_prediction_workflow()
    
    
