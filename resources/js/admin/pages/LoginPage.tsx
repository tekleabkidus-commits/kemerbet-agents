import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const passwordRef = useRef<HTMLInputElement>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(email.trim(), password);

        if (result.ok) {
            navigate('/admin', { replace: true });
        } else {
            setError(result.error ?? 'Login failed.');
            setIsSubmitting(false);
            passwordRef.current?.focus();
            passwordRef.current?.select();
        }
    }

    return (
        <div className="login-body">
            <div className="login-wrap">
                <div className="login-brand">
                    <div className="login-brand-icon">K</div>
                    <div className="login-brand-name">Kemerbet Admin</div>
                    <div className="login-brand-sub">Owner Portal</div>
                </div>

                <div className="login-card">
                    <h1>Welcome back</h1>
                    <p className="lede">Sign in to manage agents and view analytics.</p>

                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <label className="form-label">Email</label>
                            <div className="input-with-icon">
                                <Mail size={16} className="input-icon" />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="kidus@kemerbet.com"
                                    autoComplete="username"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <label className="form-label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={16} className="input-icon" />
                                <input
                                    ref={passwordRef}
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-login"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign in →'}
                        </button>
                    </form>

                    <div className="security-note">
                        <span className="lock">🔒</span>
                        This portal is restricted to authorized administrators. All access is logged.
                    </div>
                </div>
            </div>
        </div>
    );
}
