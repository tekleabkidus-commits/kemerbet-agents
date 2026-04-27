import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
}
