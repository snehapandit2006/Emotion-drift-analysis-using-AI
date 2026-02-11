import React, { useRef, useState, useEffect } from "react";
import { postSelfEmotionCapture } from "../api";

const SelfEmotionMonitor = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [streaming, setStreaming] = useState(false);
    const [latestEmotion, setLatestEmotion] = useState(null);
    const [loading, setLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState(null);

    // Stop stream when component unmounts
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, []);

    const startStream = async () => {
        setErrorMsg(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setStreaming(true);
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            setErrorMsg(`Camera Error: ${err.name}`);
            alert(`Could not access webcam. Error: ${err.name} - ${err.message}`);
        }
    };

    const stopStream = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
            setStreaming(false);
        }
    };

    const captureSnapshot = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setErrorMsg(null);

        const width = 320;
        const height = 240;

        // Set canvas dimensions
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        const base64Image = canvasRef.current.toDataURL("image/jpeg", 0.8);

        setLoading(true);
        try {
            const response = await postSelfEmotionCapture(base64Image);
            // { emotion: "happy", confidence: 0.95, timestamp: ... }
            setLatestEmotion(response.data);
        } catch (err) {
            console.error("Error capturing emotion:", err);
            const serverError = err.response?.data?.detail || "Failed to analyze face.";
            setErrorMsg(serverError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>Self Emotion Monitor</h3>

            <div style={styles.videoContainer}>
                <video
                    ref={videoRef}
                    style={{ ...styles.video, display: streaming ? "block" : "none" }}
                    width="320"
                    height="240"
                    autoPlay
                    playsInline
                />
                {!streaming && (
                    <div style={styles.placeholder}>
                        Camera Off
                    </div>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            <div style={styles.controls}>
                {!streaming ? (
                    <button onClick={startStream} style={styles.button}>
                        Start Monitoring
                    </button>
                ) : (
                    <>
                        <button
                            onClick={captureSnapshot}
                            style={{ ...styles.button, backgroundColor: "var(--primary-blue)", color: "#fff" }}
                            disabled={loading}
                        >
                            {loading ? "Analyzing..." : "Capture Emotion"}
                        </button>
                        <button
                            onClick={stopStream}
                            style={{ ...styles.button, backgroundColor: "var(--emotion-anger)", color: "#fff", marginLeft: "10px" }}
                        >
                            Stop
                        </button>
                    </>
                )}
            </div>

            {errorMsg && (
                <div style={{ color: "red", marginTop: "10px", fontWeight: "bold" }}>
                    {errorMsg}
                </div>
            )}

            {latestEmotion && !errorMsg && (
                <div style={styles.result}>
                    <p style={{ margin: "5px 0", color: "var(--text-main)" }}>Detected: <strong style={{ fontSize: "1.2em", color: "var(--primary-blue)" }}>{latestEmotion.emotion.toUpperCase()}</strong></p>
                    <p style={{ margin: "5px 0", color: "var(--text-secondary)" }}>Confidence: {(latestEmotion.confidence * 100).toFixed(1)}%</p>
                    <p style={{ margin: "5px 0", fontSize: "0.8em", color: "var(--text-secondary)", opacity: 0.8 }}>Captured at: {new Date().toLocaleTimeString()}</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: "20px",
        border: "1px solid var(--glass-border)",
        borderRadius: "10px",
        textAlign: "center",
        backgroundColor: "var(--bg-card)",
        maxWidth: "400px",
        margin: "20px auto",
        color: "var(--text-main)",
        backdropFilter: "blur(10px)",
    },
    title: {
        marginBottom: "15px",
        color: "var(--text-main)",
    },
    videoContainer: {
        marginBottom: "15px",
        display: "flex",
        justifyContent: "center",
    },
    video: {
        borderRadius: "8px",
        backgroundColor: "#000",
    },
    placeholder: {
        width: "320px",
        height: "240px",
        backgroundColor: "var(--bg-input)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-color)",
    },
    controls: {
        marginBottom: "15px",
    },
    button: {
        padding: "10px 20px",
        fontSize: "14px",
        cursor: "pointer",
        borderRadius: "5px",
        border: "none",
        backgroundColor: "var(--accent-color)",
        color: "var(--accent-text)",
        fontWeight: "bold",
    },
    result: {
        marginTop: "10px",
        padding: "10px",
        backgroundColor: "var(--bg-input)",
        borderRadius: "5px",
        border: "1px solid var(--border-color)",
    }
};

export default SelfEmotionMonitor;
