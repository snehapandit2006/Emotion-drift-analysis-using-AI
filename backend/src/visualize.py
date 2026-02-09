import matplotlib.pyplot as plt

def plot_emotion_distribution(distribution_df):
    distribution_df.plot(marker='o', figsize=(10, 5))
    plt.title("Emotion Distribution Over Time")
    plt.xlabel("Time Window")
    plt.ylabel("Probability")
    plt.grid(True)
    plt.show()

def plot_drift(drift_df, threshold):
    plt.figure(figsize=(8, 4))
    plt.plot(drift_df['window'], drift_df['drift_score'], marker='o')
    plt.axhline(threshold, linestyle='--', color='red', label='Threshold')
    plt.title("Emotion Drift Detection")
    plt.xlabel("Time Window")
    plt.ylabel("Drift Score")
    plt.legend()
    plt.grid(True)
    plt.show()
