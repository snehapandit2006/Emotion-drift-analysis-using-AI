import { useState, useEffect } from 'react';
import { Music, Video, RefreshCw, ExternalLink, Play } from 'lucide-react';
import { getMediaRecommendations } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const MediaHub = () => {
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('spotify'); // 'spotify' or 'youtube'
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [playerMode, setPlayerMode] = useState('card'); // 'card' or 'embed'

    const fetchMedia = async () => {
        setLoading(true);
        setError(null);
        setPlayerMode('card'); // Reset to card view on refresh
        try {
            const res = await getMediaRecommendations();
            if (res.data) {
                setMedia(res.data);
                setRefreshKey(prev => prev + 1);
            } else {
                setError("No data received from server.");
            }
        } catch (err) {
            console.error("Failed to fetch media:", err);
            setError(err.response?.data?.detail || err.message || "Failed to load recommendations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    const extractYouTubeId = (url) => {
        if (!url) return null;
        // Handle /embed/ID and /watch?v=ID formats
        const embedMatch = url.match(/embed\/([^/?]+)/);
        if (embedMatch) return embedMatch[1];
        const watchMatch = url.match(/[?&]v=([^&]+)/);
        if (watchMatch) return watchMatch[1];
        return null;
    };

    const getSpotifyWatchUrl = (embedUrl) => {
        if (!embedUrl) return '#';
        return embedUrl.replace('/embed/', '/');
    };

    const youtubeId = media ? extractYouTubeId(media.youtube) : null;

    // Mood-based colours
    const spotifyColor = '#1DB954';
    const youtubeColor = '#FF0000';

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto', background: 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '2rem' }}>
                    <Music size={28} color="var(--primary-blue)" />
                    Personalized Media Hub
                </h2>
                <button
                    className="icon-btn"
                    onClick={fetchMedia}
                    disabled={loading}
                    title="Refresh Recommendations"
                >
                    <RefreshCw size={20} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {media && (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                    "{media.reason}"
                </p>
            )}

            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('spotify')}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: activeTab === 'spotify' ? 'rgba(29, 185, 84, 0.2)' : 'transparent',
                        border: `1px solid ${activeTab === 'spotify' ? spotifyColor : 'var(--border-color)'}`,
                        color: activeTab === 'spotify' ? spotifyColor : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'spotify' ? '600' : '400',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Music size={20} /> Spotify
                </button>
                <button
                    onClick={() => setActiveTab('youtube')}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: activeTab === 'youtube' ? 'rgba(255, 0, 0, 0.12)' : 'transparent',
                        border: `1px solid ${activeTab === 'youtube' ? youtubeColor : 'var(--border-color)'}`,
                        color: activeTab === 'youtube' ? youtubeColor : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'youtube' ? '600' : '400',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Video size={20} /> YouTube
                </button>
            </div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <div className="loader" />
                    </motion.div>
                ) : !media ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}
                    >
                        <RefreshCw size={48} opacity={0.3} />
                        <p>{error || "No recommendations yet. Chat with Sentia first!"}</p>
                        {error && <button onClick={fetchMedia} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>}
                    </motion.div>
                ) : (
                    <motion.div
                        key={`${activeTab}-${refreshKey}-${playerMode}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* ── SPOTIFY ── */}
                        {activeTab === 'spotify' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {playerMode === 'embed' ? (
                                    <>
                                        <iframe
                                            key={`spotify-${refreshKey}`}
                                            src={`${media.spotify}?utm_source=generator`}
                                            width="100%"
                                            height="380"
                                            frameBorder="0"
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                            loading="lazy"
                                            style={{ borderRadius: '12px', background: '#121212' }}
                                        />
                                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Player blocked?{' '}
                                            <button onClick={() => setPlayerMode('card')} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                                Go back to card view
                                            </button>
                                        </p>
                                    </>
                                ) : (
                                    /* Native card view — always works */
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(29,185,84,0.15) 0%, rgba(29,185,84,0.05) 100%)',
                                        border: '1px solid rgba(29,185,84,0.3)',
                                        borderRadius: '16px',
                                        padding: '2rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        textAlign: 'center'
                                    }}>
                                        {/* Spotify logo */}
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill={spotifyColor}>
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                        </svg>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px', color: 'white', fontSize: '1.2rem' }}>Spotify — Mood Playlist</h3>
                                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                Curated track for your current mood. Opens in Spotify.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <a
                                                href={getSpotifyWatchUrl(media.spotify)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                    background: spotifyColor, color: 'white',
                                                    padding: '12px 28px', borderRadius: '50px',
                                                    textDecoration: 'none', fontWeight: '700',
                                                    fontSize: '1rem', boxShadow: '0 4px 20px rgba(29,185,84,0.4)',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <Play size={18} fill="white" /> Open in Spotify
                                            </a>
                                            <button
                                                onClick={() => setPlayerMode('embed')}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                    background: 'rgba(29,185,84,0.15)',
                                                    border: '1px solid rgba(29,185,84,0.4)',
                                                    color: spotifyColor,
                                                    padding: '12px 20px', borderRadius: '50px',
                                                    cursor: 'pointer', fontSize: '0.9rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Try Embedded Player
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── YOUTUBE ── */}
                        {activeTab === 'youtube' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {playerMode === 'embed' && youtubeId ? (
                                    <>
                                        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden' }}>
                                            <iframe
                                                key={`youtube-${refreshKey}`}
                                                src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                style={{ position: 'absolute', top: 0, left: 0 }}
                                            />
                                        </div>
                                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Player blocked?{' '}
                                            <button onClick={() => setPlayerMode('card')} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                                Go back to card view
                                            </button>
                                        </p>
                                    </>
                                ) : (
                                    /* Native card with YouTube thumbnail */
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(255,0,0,0.1) 0%, rgba(255,0,0,0.04) 100%)',
                                        border: '1px solid rgba(255,0,0,0.25)',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0'
                                    }}>
                                        {/* Thumbnail */}
                                        {youtubeId && (
                                            <div style={{ position: 'relative', width: '100%', paddingTop: '40%', overflow: 'hidden', cursor: 'pointer' }}
                                                onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank')}>
                                                <img
                                                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                                    alt="Video thumbnail"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {/* Play overlay */}
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    transition: 'background 0.2s'
                                                }}>
                                                    <div style={{
                                                        width: '60px', height: '60px', borderRadius: '50%',
                                                        background: youtubeColor,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 4px 20px rgba(255,0,0,0.5)'
                                                    }}>
                                                        <Play size={26} fill="white" color="white" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 6px', color: 'white', fontSize: '1.1rem' }}>YouTube — Mood Video</h3>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    Curated for your current emotional state.
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                <a
                                                    href={`https://www.youtube.com/watch?v=${youtubeId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        background: youtubeColor, color: 'white',
                                                        padding: '12px 28px', borderRadius: '50px',
                                                        textDecoration: 'none', fontWeight: '700',
                                                        fontSize: '1rem', boxShadow: '0 4px 20px rgba(255,0,0,0.35)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <ExternalLink size={18} /> Watch on YouTube
                                                </a>
                                                {youtubeId && (
                                                    <button
                                                        onClick={() => setPlayerMode('embed')}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                            background: 'rgba(255,0,0,0.12)',
                                                            border: '1px solid rgba(255,0,0,0.3)',
                                                            color: '#ff6b6b',
                                                            padding: '12px 20px', borderRadius: '50px',
                                                            cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500'
                                                        }}
                                                    >
                                                        Try Embedded Player
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Recommendations are updated automatically as your mood patterns shift.{' '}
                    <br />
                    Want more?{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); fetchMedia(); }} style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}>
                        Generate new suggestions →
                    </a>
                </p>
            </div>
        </div>
    );
};

export default MediaHub;
