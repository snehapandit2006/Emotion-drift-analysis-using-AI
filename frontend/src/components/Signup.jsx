import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import ThemeContext from '../context/ThemeContext';
import logoFinal from '../assets/logo_final.png';

// Signup component with theme support
const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { signup, login } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext); // Use theme context
    const navigate = useNavigate();
    const [isSigningUp, setIsSigningUp] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setIsSigningUp(true);
        try {
            await signup(email, password);
            // Auto login after signup
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
        setIsSigningUp(false);
    };

    return (
        <div className="login-screen">
            <div className="login-box">
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

                    {/* Shadow Effect */}
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '20px',
                        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%)',
                        zIndex: 0,
                        filter: 'blur(5px)',
                        transition: 'opacity 0.3s'
                    }}></div>
                </div>

                <div className="login-header">
                    <h1>Create Account</h1>
                    <p>Join Sentia for smart emotional monitoring.</p>
                </div>

                {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', margin: '0 0 10px 0', textAlign: 'center' }}>{error}</p>}

                <div className="input-group">
                    <label>Email address*</label>
                    <input
                        className="sentia-input"
                        type="email"
                        placeholder="you@example.com"
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

                <div className="input-group">
                    <label>Confirm Password*</label>
                    <input
                        className="sentia-input"
                        type="password"
                        placeholder="•••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button className="sentia-btn" onClick={handleSubmit} disabled={isSigningUp}>
                    {isSigningUp ? "Creating Account..." : "Sign Up"}
                </button>

                <p className="signup-link">
                    Already have an account? <Link to="/login"><span>Sign in</span></Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
