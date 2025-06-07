import pandas as pd
from utils import map_weather_condition_to_category

def preprocess_data(df):
    """Interpolate, fill NaNs, calculate dew point, map condition→category."""
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    # interpolate numeric cols
    for col in ['temp','dwpt','rhum','prcp','wdir','wspd','pres']:
        if col in df:
            df[col] = df[col].interpolate(method='time')
            df[col] = df[col].fillna(0.0 if col=='prcp' else df[col].mean())

    # ensure dew point
    if df['dwpt'].isna().any():
        df['dwpt'] = df['temp'] - (100 - df['rhum'])/5.0

    # map condition
    if 'coco' in df:
        df['weather_condition_category'] = df['coco'].apply(map_weather_condition_to_category)
    else:
        df['weather_condition_category'] = 'Other'

    return df

