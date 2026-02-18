import { createContext, useState, useEffect } from 'react';
import { API } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Decode token to get basic user info (optional, or just trust the token presence)
            // Ideally call /users/me endpoint, but for now we'll assume valid if token exists
            // and maybe decode it if we need email.
            // For this implementation, we just restore state:
            const email = localStorage.getItem('user_email');
            const userId = localStorage.getItem('user_id');
            const role = localStorage.getItem('user_role');
            const doctorId = localStorage.getItem('user_doctor_id');
            if (email && userId) {
                setUser({ email, id: userId, role: role || 'patient', doctor_id: doctorId });
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const params = new URLSearchParams();
            params.append('username', email.trim());
            params.append('password', password.trim());

            // Use fetch directly to avoid interceptors adding Auth header
            const apiUrl = API.defaults.baseURL || "http://127.0.0.1:8000";
            const response = await fetch(`${apiUrl}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user_email', data.email);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_role', data.role);
            if (data.doctor_id) localStorage.setItem('user_doctor_id', data.doctor_id);

            setToken(data.access_token);
            setUser({ email: data.email, id: data.user_id, role: data.role, doctor_id: data.doctor_id });
            return true;
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
            localStorage.setItem('user_role', data.role);
            if (data.doctor_id) localStorage.setItem('user_doctor_id', data.doctor_id);

            setToken(data.access_token);
            setUser({ email: data.email, id: data.user_id, role: data.role, doctor_id: data.doctor_id });
            return true;
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
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, googleLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
