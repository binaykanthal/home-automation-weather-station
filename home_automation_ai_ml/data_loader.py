from meteostat import Hourly, Point
from datetime import datetime
import pandas as pd
import requests

def fetch_historical_data(lat, lon, years=4):
    """Fetch and clean 4-year hourly data from Meteostat."""
    end = datetime.now()
    start = datetime(end.year - years, end.month, end.day)
    point = Point(lat, lon)
    df = Hourly(point, start, end).fetch()
    df.index.name = 'time'
    # drop unused columns
    return df.drop(['snow', 'tsun', 'wpgt'], axis=1)

def get_current_weather(api_key, city, base_url='https://api.weatherapi.com/v1/'):
    """Call WeatherAPI and return a single-row DataFrame of latest conditions."""
    url = f"{base_url}current.json?key={api_key}&q={city}&aqi=no"
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    row = {
        'time': data['location']['localtime'] + ':00',
        'temp': data['current']['temp_c'],
        'dwpt': data['current']['dewpoint_c'],
        'rhum': data['current']['humidity'],
        'prcp': data['current']['precip_mm'],
        'wdir': data['current']['wind_degree'],
        'wspd': data['current']['wind_kph'],
        'pres': data['current']['pressure_mb'],
        'coco': data['current']['condition']['text']
    }
    return pd.DataFrame([row]).set_index('time')
