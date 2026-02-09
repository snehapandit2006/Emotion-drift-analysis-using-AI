import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleLogin } from '@react-oauth/google';
import AppleLogin from 'react-apple-login';
import logoFinal from '../assets/logo_final.png';
import { forgotPassword, resetPassword } from '../api';
import { Sun, Moon } from 'lucide-react';

const Login = () => {
    const [view, setView] = useState('login'); // 'login', 'forgot', 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { login, googleLogin } = useContext(AuthContext);
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        const success = await login(email, password);
        setLoading(false);

        if (success) {
            navigate('/dashboard');
        } else {
            setError('Invalid email or password');
        }
    };

    const handleForgot = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await forgotPassword(email);
            setMessage('If the account exists, a reset code has been sent (check console).');
            setView('reset');
        } catch (e) {
            setError('Failed to process request.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await resetPassword(resetToken, newPassword);
            setMessage('Password reset successfully! Please login.');
            setView('login');
            setPassword('');
        } catch (e) {
            setError('Failed to reset password. Invalid or expired token.');
        } finally {
            setLoading(false);
        }
    };

    const loginGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const success = await googleLogin(tokenResponse.access_token);
            if (success) {
                navigate('/dashboard');
            } else {
                setError('Google login failed');
            }
        },
        onError: error => console.log("Google Login Failed:", error)
    });

    const handleAppleResponse = (response) => {
        if (!response.error) {
            console.log("Apple Login Success:", response);
        }
    };

    return (
        <div className="login-screen">
            <button
                className="icon-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                style={{ position: 'absolute', top: '24px', right: '24px', color: theme === 'light' ? '#333' : 'white' }}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="login-box">
                {/* Logo Replacement */}
                <div className="logo-container" style={{
                    border: 'none',
                    background: 'transparent',
                    boxShadow: 'none',
                    width: '250px',
                    height: '250px',
                    position: 'relative',
                    animation: 'sphere-levitate 3s ease-in-out infinite'
                }}>
                    {/* Top Layer: Robot (Original Colors) - Shows top 73% */}
                    <img
                        src={logoFinal}
                        alt="Sentia Robot"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            clipPath: 'inset(0 0 27% 0)',
                            zIndex: 2
                        }}
                    />

                    {/* Bottom Layer: Text (Adaptive Color) - Shows bottom 27% */}
                    <img
                        src={logoFinal}
                        alt="Sentia Text"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            clipPath: 'inset(73% 0 0 0)',
                            filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                            transition: 'filter 0.3s ease',
                            zIndex: 1
                        }}
                    />

                    {/* Shadow Element */}
                    <div style={{
                        position: 'absolute',
                        bottom: '20px', // Adjust to place below text
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        height: '15px',
                        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%)',
                        zIndex: 0,
                        filter: 'blur(4px)'
                    }}></div>
                </div>

                {view === 'login' && (
                    <>
                        <div className="login-header">
                            <h1>Welcome Back!</h1>
                            <p>Sign in to access smart, personalized emotional monitoring made for you.</p>
                        </div>

                        {error && <p style={{ color: '#ff4d4d', textAlign: 'center' }}>{error}</p>}
                        {message && <p style={{ color: '#4CAF50', textAlign: 'center' }}>{message}</p>}

                        <div className="input-group">
                            <label>Email address*</label>
                            <input
                                className="sentia-input"
                                type="email"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label>Password*</label>
                            <input
                                className="sentia-input"
                                type="password"
                                placeholder="•••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888' }}>
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="checkbox" /> Remember me
                            </label>
                            <span
                                style={{ cursor: 'pointer', color: '#e1ff5e' }}
                                onClick={() => setView('forgot')}
                            >
                                Forgot Password?
                            </span>
                        </div>

                        <button className="sentia-btn" onClick={handleLogin} disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        <div className="divider"><span>Or continue with</span></div>

                        <div className="social-btns">
                            <button className="social-btn" onClick={() => loginGoogle()}>
                                {/* Google SVG */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23.5 12.2857C23.5 11.4589 23.4255 10.6625 23.2946 9.89285H12V14.5179H18.4625C18.1821 15.9929 17.3071 17.25 16.0357 18.1V21.0714H19.9071C22.175 18.9857 23.5 15.9179 23.5 12.2857Z" fill="#4285F4" />
                                    <path d="M12 24C15.2321 24 17.9429 22.9286 19.9107 21.0714L16.0357 18.1C14.9607 18.8143 13.5893 19.2321 12 19.2321C8.875 19.2321 6.225 17.1214 5.275 14.275H1.275V17.375C3.25 21.3 7.31071 24 12 24Z" fill="#34A853" />
                                    <path d="M5.275 14.275C5.025 13.5536 4.88929 12.7821 4.88929 12C4.88929 11.2179 5.025 10.4464 5.275 9.725V6.625H1.275C0.460714 8.24286 0 10.075 0 12C0 13.925 0.460714 15.7571 1.275 17.375L5.275 14.275Z" fill="#FBBC05" />
                                    <path d="M12 4.76786C13.7571 4.76786 15.3286 5.37143 16.5679 6.56071L20.0071 3.12143C17.9393 1.19286 15.2286 0 12 0C7.31071 0 3.25 2.69643 1.275 6.625L5.275 9.725C6.225 6.87857 8.875 4.76786 12 4.76786Z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                            {/* Apple Login Placeholder */}
                            <AppleLogin
                                clientId="YOUR_CLIENT_ID"
                                redirectURI="YOUR_REDIRECT_URL"
                                render={renderProps => (
                                    <button className="social-btn" onClick={renderProps.onClick} disabled={renderProps.disabled}>
                                        <svg width="24" height="24" viewBox="0 0 384 512" fill="white" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
                                        </svg>
                                        Apple
                                    </button>
                                )}
                            />
                        </div>
                        <p className="signup-link">
                            Don't have an account? <Link to="/signup"><span>Sign up</span></Link>
                        </p>
                    </>
                )}

                {view === 'forgot' && (
                    <>
                        <div className="login-header">
                            <h1>Forgot Password</h1>
                            <p>Enter your email to receive a reset code.</p>
                        </div>
                        {error && <p style={{ color: '#ff4d4d', textAlign: 'center' }}>{error}</p>}
                        <div className="input-group">
                            <label>Email address*</label>
                            <input
                                className="sentia-input"
                                type="email"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button className="sentia-btn" onClick={handleForgot} disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                        <p className="signup-link">
                            <span onClick={() => setView('login')}>Back to Login</span>
                        </p>
                    </>
                )}

                {view === 'reset' && (
                    <>
                        <div className="login-header">
                            <h1>Reset Password</h1>
                            <p>Enter the code sent to your email (console) and your new password.</p>
                        </div>
                        {error && <p style={{ color: '#ff4d4d', textAlign: 'center' }}>{error}</p>}
                        {message && <p style={{ color: '#4CAF50', textAlign: 'center' }}>{message}</p>}

                        <div className="input-group">
                            <label>Reset Token*</label>
                            <input
                                className="sentia-input"
                                type="text"
                                placeholder="Paste token here"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>New Password*</label>
                            <input
                                className="sentia-input"
                                type="password"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <button className="sentia-btn" onClick={handleReset} disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                        <p className="signup-link">
                            <span onClick={() => setView('login')}>Back to Login</span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
