import pandas as pd
import numpy as np
from scipy.spatial.distance import jensenshannon

def detect_drift(distribution_df):
    drift_scores = []
    windows = distribution_df.index

    for i in range(1, len(distribution_df)):
        p = distribution_df.iloc[i - 1].values
        q = distribution_df.iloc[i].values
        drift_scores.append(jensenshannon(p, q))

    drift_df = pd.DataFrame({
        "window": windows[1:],
        "drift_score": drift_scores
    })

    threshold = drift_df['drift_score'].mean() + drift_df['drift_score'].std()
    drift_df['drift_detected'] = drift_df['drift_score'] > threshold

    return drift_df, threshold
