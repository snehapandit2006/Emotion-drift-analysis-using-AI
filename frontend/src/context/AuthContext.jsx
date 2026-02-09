import { createContext, useState, useEffect } from 'react';

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
            if (email && userId) {
                setUser({ email, id: userId });
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const params = new URLSearchParams();
            params.append('username', email.trim()); // Trim whitespace
            params.append('password', password.trim()); // Trim whitespace

            const response = await fetch('http://127.0.0.1:8000/auth/token', {
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

            setToken(data.access_token);
            setUser({ email: data.email, id: data.user_id });
            return true;
        } catch (error) {
            console.error(error);
            // Re-throw so component can display it
            throw error; 
        }
    };

    const signup = async (email, password) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                const err = await response.json();
                const errorMessage = Array.isArray(err.detail)
                    ? err.detail.map(e => e.msg).join(', ')
                    : (err.detail || 'Signup failed');
                throw new Error(errorMessage);
            }
            return true;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const googleLogin = async (accessToken) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_token: accessToken }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Backend Error:", errorText);
                throw new Error(`Google login failed: ${errorText}`);
            }

            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user_email', data.email);
            localStorage.setItem('user_id', data.user_id);

            setToken(data.access_token);
            setUser({ email: data.email, id: data.user_id });
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
