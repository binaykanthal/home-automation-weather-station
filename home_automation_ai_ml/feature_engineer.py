def feature_engineer(df):
    """Add time features, lags and rolling stats."""
    df = df.copy()
    df['hour']        = df.index.hour
    df['day_of_week'] = df.index.dayofweek
    df['day_of_year'] = df.index.dayofyear
    df['month']       = df.index.month
    df['year']        = df.index.year

    # lags
    for col in ['temp','rhum','prcp','wspd','pres','dwpt','wdir']:
        df[f'{col}_lag1']  = df[col].shift(1)
        df[f'{col}_lag24'] = df[col].shift(24)

    # rolling
    for col in ['temp','rhum','prcp','wspd','pres','dwpt']:
        df[f'{col}_roll_mean24'] = df[col].rolling(24, min_periods=1).mean()
        df[f'{col}_roll_std24']  = df[col].rolling(24, min_periods=1).std()

    return df.dropna()