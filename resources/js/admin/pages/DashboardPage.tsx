import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

function formatToday(): string {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSigningOut, setIsSigningOut] = useState(false);

    if (!user) return null;

    async function handleSignOut() {
        if (!confirm('Sign out?')) return;
        setIsSigningOut(true);
        await logout();
        navigate('/admin/login', { replace: true });
    }

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Dashboard</h1>
                    <div className="subtitle">{formatToday()}</div>
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                    >
                        <LogOut size={14} />
                        {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                </div>
            </div>

            <div className="panel">
                <div className="panel-body">
                    <h2 className="panel-title">Welcome, {user.name}</h2>
                    <p className="panel-text">
                        This is your Kemerbet admin dashboard. Real-time stats, the live agent grid,
                        and analytics will appear here once Phase B wires up the data layer.
                    </p>
                </div>
            </div>
        </>
    );
}
