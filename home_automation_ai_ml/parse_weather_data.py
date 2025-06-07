import pandas as pd
from meteostat import Hourly, Point
from datetime import datetime, timedelta
from preprocessing import preprocess_data

def read_historical_data(filename):
  df = pd.read_csv(filename) 
  df = df.set_index('time') 
  df = df.drop_duplicates() 
  return df

kolkata = Point(22.5726, 88.3639, 5)
def fetch_historical_data():
    """Fetch and clean last 24 hourly data from Meteostat."""
    end = datetime.now()
    start = end - timedelta(days=1)
    df = Hourly(kolkata, start, end).fetch()
    df.index.name = 'time'
    # drop unused columns
    return df.drop(['snow', 'tsun', 'wpgt'], axis=1)

hist24 = preprocess_data(fetch_historical_data()).iloc[-24:].to_csv('kolkata_weather_data_last24.csv')