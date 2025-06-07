import joblib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report

def train_and_persist(df):
    """Train 3 models, evaluate, and save artifacts to disk."""
    # targets
    y_temp = df['temp']
    y_prcp = df['prcp']
    y_cond = LabelEncoder().fit_transform(df['weather_condition_category'])

    # features
    drop_cols = ['temp','prcp','coco','weather_condition_category']
    X = df.drop(columns=drop_cols)

    # scale
    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)

    # train/test split
    split = int(len(Xs)*0.8)
    Xtr, Xte = Xs[:split], Xs[split:]
    yt, yv = y_temp[:split], y_temp[split:]
    prt, prv = y_prcp[:split], y_prcp[split:]
    ct, cv = y_cond[:split], y_cond[split:]

    # models
    rf_t = RandomForestRegressor(n_estimators=100, n_jobs=-1).fit(Xtr, yt)
    rf_p = RandomForestRegressor(n_estimators=100, n_jobs=-1).fit(Xtr, prt)
    rf_c = RandomForestClassifier(n_estimators=100, n_jobs=-1).fit(Xtr, ct)

    # evaluate
    print("Temp R2:", r2_score(yv, rf_t.predict(Xte)))
    print("Prcp R2:", r2_score(prv, rf_p.predict(Xte)))
    print("Cond Acc:", accuracy_score(cv, rf_c.predict(Xte)))
    print(classification_report(cv, rf_c.predict(Xte)))

    # persist
    joblib.dump(rf_t, 'models/rf_temp_model.pkl')
    joblib.dump(rf_p, 'models/rf_prcp_model.pkl')
    joblib.dump(rf_c, 'models/rf_weather_model.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    joblib.dump(LabelEncoder().fit(df['weather_condition_category']),
                'models/label_encoder.pkl')
    joblib.dump(X.columns, 'models/feature_columns.pkl')