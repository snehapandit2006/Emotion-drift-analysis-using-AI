import { useState, useEffect } from 'react';
import { Music, Video, RefreshCw, ExternalLink, Play, ListMusic, Radio } from 'lucide-react';
import { getMediaRecommendations } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCY_TRACKS = [
    { name: '432 Hz – Universal Healing', url: 'https://www.youtube.com/watch?v=74zk3NjJqSA', description: 'Reduces anxiety, brings inner peace' },
    { name: '528 Hz – DNA Repair', url: 'https://www.youtube.com/watch?v=FEKatIQEeEk', description: 'Solfeggio frequency for transformation' },
    { name: '396 Hz – Liberation from Fear', url: 'https://www.youtube.com/watch?v=qHbDzpXt9iI', description: 'Removes guilt and fear blocks' },
    { name: '639 Hz – Harmonious Relationships', url: 'https://www.youtube.com/watch?v=4gGJBZRFe8o', description: 'Reconnecting and balancing' },
    { name: 'Delta Waves – Deep Sleep', url: 'https://www.youtube.com/watch?v=A6KJ0OHSYFM', description: '0.5-4Hz brainwave entrainment' },
    { name: 'Alpha Waves – Calm Focus', url: 'https://www.youtube.com/watch?v=WPni755-Krg', description: '8-12Hz focus and relaxation' },
    { name: 'Theta Waves – Meditation', url: 'https://www.youtube.com/watch?v=bHU8KGY7ER8', description: '4-8Hz deep meditation state' },
];

const PLAYLIST_STORAGE_KEY = 'sentia_personal_playlists';

const MediaHub = () => {
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mood'); 
    const [mediaType, setMediaType] = useState('spotify'); 
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [playerMode, setPlayerMode] = useState('card');

    const [playlists, setPlaylists] = useState(() => {
        try { return JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY)) || []; }
        catch { return []; }
    });
    const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const fetchMedia = async () => {
        setLoading(true);
        setError(null);
        setPlayerMode('card');
        try {
            const res = await getMediaRecommendations();
            if (res.data) {
                setMedia(res.data);
                setRefreshKey(prev => prev + 1);
            }
        } catch (err) {
            setError(err.message || "Failed to load recommendations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMedia(); }, []);

    const extractYouTubeId = (url) => {
        if (!url) return null;
        // Handle watch URLs: youtube.com/watch?v=ID
        const watchMatch = url.match(/[?&]v=([^&]+)/);
        if (watchMatch) return watchMatch[1];
        // Handle embed URLs: youtube.com/embed/ID
        const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
        if (embedMatch) return embedMatch[1];
        return null;
    };

    const addPlaylist = () => {
        if (!newPlaylistUrl.trim()) return;
        const updated = [...playlists, {
            id: Date.now(),
            name: newPlaylistName || 'My Playlist',
            url: newPlaylistUrl.trim(),
            embedUrl: newPlaylistUrl.replace('open.spotify.com', 'open.spotify.com/embed'),
            addedAt: new Date().toLocaleDateString()
        }];
        setPlaylists(updated);
        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(updated));
        setNewPlaylistUrl('');
        setNewPlaylistName('');
    };

    const removePlaylist = (id) => {
        const updated = playlists.filter(p => p.id !== id);
        setPlaylists(updated);
        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(updated));
    };

    const tabStyle = (isActive, accent = 'var(--accent-purple)') => ({
        flex: 1,
        padding: '0.9rem',
        borderRadius: '16px',
        border: '1px solid var(--glass-border)',
        background: isActive ? 'var(--glass-highlight)' : 'rgba(255,255,255,0.02)',
        color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: isActive ? '700' : '500',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isActive ? `0 0 20px -5px ${accent}44` : 'none'
    });

    const youtubeId = media ? extractYouTubeId(media.youtube) : null;

    return (
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '1rem', letterSpacing: '4px', color: 'var(--accent-blue)', opacity: 1 }}>
                    <Music size={24} /> RESONANCE HUB
                </h2>
                <button className="glass-button" onClick={fetchMedia} disabled={loading} style={{ width: '48px', height: '48px', padding: 0 }}>
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => setActiveTab('mood')} style={tabStyle(activeTab === 'mood', 'var(--accent-blue)')}>
                    <Music size={18} /> Mood
                </button>
                <button onClick={() => setActiveTab('playlist')} style={tabStyle(activeTab === 'playlist', 'var(--accent-green)')}>
                    <ListMusic size={18} /> Library
                </button>
                <button onClick={() => setActiveTab('frequency')} style={tabStyle(activeTab === 'frequency', 'var(--accent-purple)')}>
                    <Radio size={18} /> Solfeggio
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'mood' && (
                    <motion.div key="mood" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        {media && (
                            <div style={{ 
                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', 
                                borderRadius: '16px', padding: '1.25rem 1.75rem', marginBottom: '2rem',
                                display: 'flex', alignItems: 'center', gap: '15px'
                            }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--glass-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✨</div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    {media.reason}
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <button onClick={() => setMediaType('spotify')} style={{ ...tabStyle(mediaType === 'spotify', 'var(--accent-green)'), height: '42px', padding: 0 }}>Spotify</button>
                            <button onClick={() => setMediaType('youtube')} style={{ ...tabStyle(mediaType === 'youtube', 'var(--emotion-anger)'), height: '42px', padding: 0 }}>YouTube</button>
                        </div>

                        {loading ? (
                            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="loader" style={{ width: '24px', height: '24px', border: '2px solid var(--glass-border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : mediaType === 'spotify' ? (
                            // Spotify blocks all 3rd-party iframes via X-Frame-Options: SAMEORIGIN.
                            // We display a premium link card instead.
                            <div style={{
                                border: '1px solid rgba(30,215,96,0.25)', borderRadius: '24px',
                                background: 'linear-gradient(135deg, rgba(30,215,96,0.06) 0%, rgba(0,0,0,0.3) 100%)',
                                padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '1.5rem', textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #1ed760, #17a84a)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 32px rgba(30,215,96,0.3)', fontSize: '2rem'
                                }}>🎵</div>
                                <div>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Curated Spotify Playlist</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                        A mood-matched playlist has been selected for you. Open it directly in Spotify for the best experience.
                                    </div>
                                </div>
                                {media?.spotify && (
                                    <a
                                        href={media.spotify.replace('open.spotify.com/embed/', 'open.spotify.com/')}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{
                                            background: '#1ed760', color: '#000', fontWeight: '800',
                                            padding: '0.85rem 2.5rem', borderRadius: '100px',
                                            textDecoration: 'none', fontSize: '0.95rem',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            boxShadow: '0 4px 20px rgba(30,215,96,0.3)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Play size={18} fill="#000" /> Open in Spotify
                                    </a>
                                )}
                            </div>
                        ) : (
                            // YouTube blocks iframes on localhost via X-Frame-Options.
                            // Premium clickable thumbnail card instead.
                            <div style={{
                                border: '1px solid rgba(255,0,0,0.2)', borderRadius: '24px',
                                background: 'linear-gradient(135deg, rgba(255,0,0,0.06) 0%, rgba(0,0,0,0.35) 100%)',
                                overflow: 'hidden'
                            }}>
                                <a
                                    href={`https://www.youtube.com/watch?v=${youtubeId || '5yx6BWlEVcU'}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'block', position: 'relative', cursor: 'pointer', textDecoration: 'none' }}
                                >
                                    <img
                                        src={`https://img.youtube.com/vi/${youtubeId || '5yx6BWlEVcU'}/hqdefault.jpg`}
                                        alt="YouTube Thumbnail"
                                        style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block', borderRadius: '22px 22px 0 0', filter: 'brightness(0.75)' }}
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                    {/* Play button overlay */}
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '68px', height: '68px', borderRadius: '50%',
                                        background: 'rgba(255,0,0,0.9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 24px rgba(255,0,0,0.5)',
                                        transition: 'transform 0.2s ease'
                                    }}>
                                        <Play size={28} fill="white" color="white" style={{ marginLeft: '4px' }} />
                                    </div>
                                    <div style={{
                                        position: 'absolute', bottom: '12px', left: '16px',
                                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                                        padding: '4px 10px', borderRadius: '6px',
                                        color: 'white', fontSize: '0.75rem', fontWeight: '600'
                                    }}>
                                        Click to Watch on YouTube
                                    </div>
                                </a>
                                <div style={{ padding: '1.25rem 2rem', textAlign: 'center' }}>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${youtubeId || '5yx6BWlEVcU'}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="glass-button"
                                        style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}
                                    >
                                        <ExternalLink size={14} style={{ marginRight: '8px' }} /> Open in YouTube
                                    </a>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'playlist' && (
                    <motion.div key="playlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                            <h3 style={{ color: 'var(--text-main)', margin: '0 0 1.25rem', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '1px' }}>SYNC NEW SOURCE</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                    type="text" placeholder="Designation (e.g. Morning Calm)" value={newPlaylistName}
                                    onChange={e => setNewPlaylistName(e.target.value)}
                                    style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="url" placeholder="Spotify Link" value={newPlaylistUrl}
                                    onChange={e => setNewPlaylistUrl(e.target.value)}
                                    style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                />
                                <button onClick={addPlaylist} className="glass-button primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                    Register Source
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {playlists.map(pl => (
                                <div key={pl.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '20px', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '700' }}>{pl.name}</h4>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Synchronized {pl.addedAt}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => removePlaylist(pl.id)} style={{ background: 'none', border: 'none', color: 'var(--emotion-anger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                                                Purge
                                            </button>
                                        </div>
                                    </div>
                                    <iframe src={pl.embedUrl} width="100%" height="80" frameBorder="0" allow="encrypted-media" loading="lazy" style={{ display: 'block' }} />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'frequency' && (
                    <motion.div key="frequency" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                            {FREQUENCY_TRACKS.map((track, i) => (
                                <a key={i} href={track.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '20px',
                                        padding: '1.5rem', height: '100%', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        display: 'flex', flexDirection: 'column', gap: '12px'
                                    }}
                                    className="hover-card">
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--glass-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚡</div>
                                        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '800' }}>{track.name}</h4>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.6 }}>{track.description}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MediaHub;
