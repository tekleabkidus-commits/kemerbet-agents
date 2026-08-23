import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    UsersRound,
    Globe,
    Grid,
    Banknote,
    CreditCard,
    Settings,
    Megaphone,
    ScrollText,
} from 'lucide-react';

export default function AdminLayout() {
    const { user } = useAuth();
    const location = useLocation();

    const initial = user?.name?.charAt(0).toUpperCase() ?? 'A';

    // Keep the analytics filter selection (URL search params) when moving
    // between analytics pages.
    const analyticsSearch = location.pathname.startsWith('/admin/analytics') ? location.search : '';

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-icon">K</div>
                    <div className="brand-text">
                        <div className="brand-name">Kemerbet</div>
                        <div className="brand-sub">Admin</div>
                    </div>
                </div>

                <div className="nav-label">Main</div>

                <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <LayoutDashboard size={18} className="icon" />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/admin/agents" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Users size={18} className="icon" />
                    <span>Agents</span>
                    {/* TODO: wire to real agent count in Phase B */}
                    <span className="badge">24</span>
                </NavLink>

                <div className="nav-label">Analytics</div>

                <NavLink to={`/admin/analytics/overview${analyticsSearch}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <BarChart3 size={18} className="icon" />
                    <span>Overview</span>
                </NavLink>

                <NavLink to={`/admin/analytics/agents${analyticsSearch}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <UsersRound size={18} className="icon" />
                    <span>Agents</span>
                </NavLink>

                <NavLink to={`/admin/analytics/customers${analyticsSearch}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Globe size={18} className="icon" />
                    <span>Customers</span>
                </NavLink>

                <NavLink to={`/admin/analytics/coverage${analyticsSearch}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Grid size={18} className="icon" />
                    <span>Coverage</span>
                </NavLink>

                <NavLink to={`/admin/analytics/withdrawals${analyticsSearch}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Banknote size={18} className="icon" />
                    <span>Withdrawals</span>
                </NavLink>

                <div className="nav-label">Setup</div>

                <NavLink to="/admin/payment-methods" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <CreditCard size={18} className="icon" />
                    <span>Payment Methods</span>
                </NavLink>

                <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Settings size={18} className="icon" />
                    <span>Settings</span>
                </NavLink>

                <NavLink to="/admin/notices" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Megaphone size={18} className="icon" />
                    <span>Notices</span>
                </NavLink>

                <div className="nav-label">Audit</div>

                <NavLink to="/admin/activity" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ScrollText size={18} className="icon" />
                    <span>Activity Log</span>
                </NavLink>

                <div className="sidebar-bottom">
                    <div className="user-pill">
                        <div className="user-avatar">{initial}</div>
                        <div className="user-info">
                            <div className="user-name">{user?.name ?? 'Admin'}</div>
                            <div className="user-role">Owner</div>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="main">
                <Outlet />
            </main>
        </div>
    );
}
