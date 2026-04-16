import { createContext, useState, useEffect } from 'react';
import { API } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            const email = localStorage.getItem('user_email');
            const userId = localStorage.getItem('user_id');
            const role = localStorage.getItem('user_role');
            const doctorId = localStorage.getItem('user_doctor_id');
            const hobbies = localStorage.getItem('user_hobbies');
            const preferredGames = localStorage.getItem('user_preferred_games');
            const musicInterests = localStorage.getItem('user_music_interests');
            if (email && userId) {
                setUser({ 
                    email, 
                    id: userId, 
                    role: role || 'patient', 
                    doctor_id: doctorId || null,
                    hobbies: hobbies || '',
                    preferred_games: preferredGames || '',
                    music_interests: musicInterests || ''
                });
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const params = new URLSearchParams();
            params.append('username', email.trim());
            params.append('password', password.trim());
 
            console.log(`[AuthContext] Attempting login for: ${email}`);

            // Use fetch directly to avoid interceptors adding Auth header
            const apiUrl = API.defaults.baseURL || "http://127.0.0.1:8000";
            const response = await fetch(`${apiUrl}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Network response was not OK' }));
                console.error('[AuthContext] Login failed:', err);
                throw new Error(err.detail || 'Login failed');
            }

            const data = await response.json();
            console.log('[AuthContext] Login successful, initializing session');
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user_email', data.email);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_role', data.role || 'patient');
            // Always write all fields — even empty string — so previous user's values are cleared
            localStorage.setItem('user_doctor_id', data.doctor_id || '');
            localStorage.setItem('user_hobbies', data.hobbies || '');
            localStorage.setItem('user_preferred_games', data.preferred_games || '');
            localStorage.setItem('user_music_interests', data.music_interests || '');

            setToken(data.access_token);
            setUser({ 
                email: data.email, 
                id: data.user_id, 
                role: data.role || 'patient', 
                doctor_id: data.doctor_id || null,
                hobbies: data.hobbies || '',
                preferred_games: data.preferred_games || '',
                music_interests: data.music_interests || ''
            });
            return { success: true, role: data.role || 'patient' };
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const signup = async (email, password, role = 'patient') => {
        try {
            await API.post('/auth/signup', { email, password, role });
            return true;
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.detail
                ? (Array.isArray(error.response.data.detail)
                    ? error.response.data.detail.map(e => e.msg).join(', ')
                    : error.response.data.detail)
                : 'Signup failed';
            throw new Error(errorMessage);
        }
    };

    const googleLogin = async (accessToken) => {
        try {
            const response = await API.post('/auth/google', { access_token: accessToken });
            const data = response.data;

            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user_email', data.email);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_role', data.role || 'patient');
            // Always write all fields — even empty string — so previous user's values are cleared
            localStorage.setItem('user_doctor_id', data.doctor_id || '');
            localStorage.setItem('user_hobbies', data.hobbies || '');
            localStorage.setItem('user_preferred_games', data.preferred_games || '');
            localStorage.setItem('user_music_interests', data.music_interests || '');

            setToken(data.access_token);
            setUser({ 
                email: data.email, 
                id: data.user_id, 
                role: data.role || 'patient', 
                doctor_id: data.doctor_id || null,
                hobbies: data.hobbies || '',
                preferred_games: data.preferred_games || '',
                music_interests: data.music_interests || ''
            });
            return { success: true, role: data.role || 'patient' };
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_doctor_id');
        localStorage.removeItem('user_hobbies');
        localStorage.removeItem('user_preferred_games');
        localStorage.removeItem('user_music_interests');
        setToken(null);
        setUser(null);
    };

    const updateUserProfile = (newData) => {
        if (newData.hobbies !== undefined) localStorage.setItem('user_hobbies', newData.hobbies);
        if (newData.preferred_games !== undefined) localStorage.setItem('user_preferred_games', newData.preferred_games);
        if (newData.music_interests !== undefined) localStorage.setItem('user_music_interests', newData.music_interests);
        
        setUser(prev => ({
            ...prev,
            ...newData
        }));
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, googleLogin, logout, updateUserProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
