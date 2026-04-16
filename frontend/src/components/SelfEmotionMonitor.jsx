import React, { useRef, useState, useEffect } from "react";
import { postSelfEmotionCapture } from "../api";

const getEmotionColor = (emotion) => {
    const emotionColors = {
        joy: "var(--emotion-happy)",
        happy: "var(--emotion-happy)",
        fear: "var(--emotion-fear)",
        sadness: "var(--emotion-sadness)",
        anger: "var(--emotion-anger)",
        surprise: "var(--emotion-surprise)",
        neutral: "var(--emotion-neutral)",
        love: "var(--emotion-love)",
        disgust: "var(--emotion-disgust)"
    };
    return emotionColors[emotion?.toLowerCase()] || "var(--primary-blue)";
};

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
            setLatestEmotion(response.data);
            // Refresh dashboard
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));
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
                    <div className="orb-container" style={styles.placeholder}>
                        <div className="pulsing-orb" style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 30% 30%, ${getEmotionColor(latestEmotion?.emotion)}, transparent)`,
                            filter: 'blur(20px)',
                            opacity: 0.6,
                            animation: 'pulse-orb 4s ease-in-out infinite'
                        }}></div>
                        <div style={{ position: 'absolute', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                            {latestEmotion ? latestEmotion.emotion : 'READY'}
                        </div>
                        <style>{`
                            @keyframes pulse-orb {
                                0%, 100% { transform: scale(1); opacity: 0.4; filter: blur(20px); }
                                50% { transform: scale(1.2); opacity: 0.7; filter: blur(30px); }
                            }
                        `}</style>
                    </div>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            <div style={styles.controls}>
                {!streaming ? (
                    <button onClick={startStream} style={{ ...styles.button, borderRadius: '100px', fontSize: '0.7rem', padding: '6px 20px', background: 'rgba(255,255,255,0.05)', border: 'none' }}>
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
                    <p style={{ margin: "4px 0", color: "var(--text-main)", fontSize: "0.85rem" }}>
                        Detected: <strong style={{
                            fontSize: "1.1em",
                            color: getEmotionColor(latestEmotion.emotion)
                        }}>{latestEmotion.emotion.toUpperCase()}</strong>
                    </p>
                    <p style={{ margin: "2px 0", color: "var(--text-secondary)", fontSize: "0.75rem" }}>Confidence: {(latestEmotion.confidence * 100).toFixed(1)}%</p>
                    <p style={{ margin: "2px 0", fontSize: "0.7rem", color: "var(--text-secondary)", opacity: 0.7 }}>Captured: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        textAlign: "center",
        color: "var(--text-main)",
        width: "100%",
    },
    title: {
        marginBottom: "15px",
        color: "var(--text-main)",
        display: "none", // Hide title as Bento headers are in App.jsx
    },
    videoContainer: {
        marginBottom: "20px",
        display: "flex",
        justifyContent: "center",
        position: 'relative'
    },
    video: {
        borderRadius: "12px",
        backgroundColor: "#000",
        border: '1px solid var(--glass-border)'
    },
    placeholder: {
        width: "320px",
        height: "240px",
        backgroundColor: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "12px",
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--glass-border)'
    },
    controls: {
        marginBottom: "10px",
        display: 'flex',
        justifyContent: 'center',
        gap: '12px'
    },
    button: {
        padding: "10px 20px",
        fontSize: "13px",
        cursor: "pointer",
        borderRadius: "100px",
        border: "1px solid var(--glass-border)",
        backgroundColor: "rgba(255,255,255,0.05)",
        color: "var(--text-main)",
        fontWeight: "600",
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)'
    },
    result: {
        marginTop: "10px",
        padding: "12px",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        border: "1px solid var(--glass-border)",
    }
};

export default SelfEmotionMonitor;
