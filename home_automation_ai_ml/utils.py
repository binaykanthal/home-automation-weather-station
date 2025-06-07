import pandas as pd

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