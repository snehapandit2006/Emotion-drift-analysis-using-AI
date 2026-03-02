import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoFinal from '../assets/logo_final.png';

// Signup component with theme support
const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const { signup, login } = useContext(AuthContext);
    const { theme } = useTheme(); // Use theme context
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
            await signup(email, password, role);
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
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Spacer to establish width */}
                        <img src={logoFinal} alt="" style={{ height: '120px', opacity: 0 }} />

                        {/* Top Layer: Robot (Original Colors) - Shows top 73% */}
                        <img
                            src={logoFinal}
                            alt="Sentia Robot"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                height: '100%',
                                clipPath: 'inset(0 0 27% 0)',
                                zIndex: 2
                            }}
                        />

                        {/* Bottom Layer: Text (White in Dark Mode) - Shows bottom 27% */}
                        <img
                            src={logoFinal}
                            alt="Sentia Text"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                height: '100%',
                                clipPath: 'inset(73% 0 0 0)',
                                filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                                transition: 'filter 0.3s ease',
                                zIndex: 1
                            }}
                        />
                    </div>
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

                <div className="input-group">
                    <label>I am a:</label>
                    <select
                        className="sentia-input"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-main)' }}
                    >
                        <option value="patient">Patient</option>
                        <option value="psychiatrist">Psychiatrist</option>
                    </select>
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
