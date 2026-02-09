import pandas as pd

def build_emotion_timeline(df, date_col, emotion_col, freq='W'):
    df = df.copy()
    df['window'] = df[date_col].dt.to_period(freq).apply(lambda r: r.start_time)

    counts = (
        df
        .groupby(['window', emotion_col])
        .size()
        .unstack(fill_value=0)
    )

    distribution = counts.div(counts.sum(axis=1), axis=0)
    return distribution
