import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    Activity, BarChart3, Banknote, Bell, ChevronRight, Command,
    Grid2X2, LayoutDashboard, LogOut, Menu, Megaphone, Moon, Search, Settings2,
    ShieldCheck, Sun, Users, UsersRound, Wallet, X,
} from 'lucide-react';

type NavigationItem = {
    label: string;
    to: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
};

const groups: { label: string; items: NavigationItem[] }[] = [
    {
        label: 'WORKSPACE',
        items: [
            { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
            { label: 'Manage agents', to: '/admin/agents', icon: Users },
            { label: 'Payment methods', to: '/admin/payment-methods', icon: Wallet },
            { label: 'Notices', to: '/admin/notices', icon: Megaphone },
        ],
    },
    {
        label: 'INSIGHTS & REPORTING',
        items: [
            { label: 'Overview', to: '/admin/analytics/overview', icon: BarChart3 },
            { label: 'Agent performance', to: '/admin/analytics/agents', icon: UsersRound },
            { label: 'Customers', to: '/admin/analytics/customers', icon: Users },
            { label: 'Coverage', to: '/admin/analytics/coverage', icon: Grid2X2 },
            { label: 'Withdrawals', to: '/admin/analytics/withdrawals', icon: Banknote },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { label: 'Activity log', to: '/admin/activity', icon: Activity },
            { label: 'Settings', to: '/admin/settings', icon: Settings2 },
        ],
    },
];

const allPages = groups.flatMap(group => group.items);

function getStoredTheme(): 'light' | 'dark' {
    try {
        return window.localStorage.getItem('kemerbet_admin_theme') === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme);
    const searchRef = useRef<HTMLInputElement>(null);
    const initial = user?.name?.charAt(0).toUpperCase() ?? 'A';
    const page = allPages.find(item => item.exact ? location.pathname === item.to : location.pathname === item.to)
        ?? allPages[0];
    const results = allPages.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()));
    const analyticsSearch = location.pathname.startsWith('/admin/analytics') ? location.search : '';

    useEffect(() => {
        setMobileOpen(false);
        setSearchOpen(false);
        setQuery('');
    }, [location.pathname]);

    useEffect(() => {
        const onShortcut = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(open => !open);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setMobileOpen(false);
            }
        };
        document.addEventListener('keydown', onShortcut);
        return () => document.removeEventListener('keydown', onShortcut);
    }, []);

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen || searchOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen, searchOpen]);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        try { window.localStorage.setItem('kemerbet_admin_theme', next); } catch { /* private browsing */ }
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setLogoutError('');
        try {
            await logout();
            navigate('/admin/login', { replace: true });
        } catch {
            setLogoutError('Could not sign out. Please try again.');
        } finally {
            setLoggingOut(false);
        }
    };

    const openPage = (path: string) => {
        setSearchOpen(false);
        setMobileOpen(false);
        navigate(path);
    };

    return (
        <div className={`app premium-app ${theme === 'dark' ? 'theme-dark' : ''}`}>
            {mobileOpen && (
                <button
                    className="mobile-nav-scrim"
                    aria-label="Close navigation"
                    onClick={() => setMobileOpen(false)}
                />
            )}
            <aside className={`sidebar premium-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
                <div className="sidebar-brand-row">
                    <NavLink to="/admin" className="premium-brand" onClick={() => setMobileOpen(false)}>
                        <span className="premium-brand-mark">K<span className="brand-mark-dot">.</span></span>
                        <span className="premium-brand-text">
                            <strong>Kemerbet</strong>
                            <small>AGENT OPERATIONS</small>
                        </span>
                    </NavLink>
                    <button className="sidebar-close icon-action" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                        <X size={19} />
                    </button>
                </div>
                <div className="sidebar-workspace">
                    <span className="workspace-avatar">K</span>
                    <span className="workspace-identity"><strong>Kemerbet</strong><small>Operations workspace</small></span>
                    <ShieldCheck size={17} className="workspace-shield" />
                </div>
                <nav className="premium-nav">
                    {groups.map(group => (
                        <div className="premium-nav-section" key={group.label}>
                            <div className="nav-section-label">{group.label}</div>
                            {group.items.map(item => {
                                const Icon = item.icon;
                                const destination = item.to.startsWith('/admin/analytics') ? item.to + analyticsSearch : item.to;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={destination}
                                        end={item.exact}
                                        onClick={() => setMobileOpen(false)}
                                        className={({ isActive }) => `premium-nav-link${isActive ? ' is-active' : ''}`}
                                    >
                                        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                                        <span>{item.label}</span>
                                        <ChevronRight size={15} className="nav-link-chevron" aria-hidden="true" />
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="premium-sidebar-footer">
                    <div className="system-status"><span className="status-glow" /> Admin workspace <span>Secure</span></div>
                    <NavLink to="/admin/settings" className="sidebar-user" onClick={() => setMobileOpen(false)}>
                        <span className="sidebar-user-avatar">{initial}</span>
                        <span className="sidebar-user-info"><strong>{user?.name ?? 'Admin'}</strong><small>Account settings</small></span>
                        <ChevronRight size={16} />
                    </NavLink>
                    {logoutError && <p className="sidebar-logout-error" role="alert">{logoutError}</p>}
                    <button type="button" className="sidebar-logout" onClick={handleLogout} disabled={loggingOut}>
                        <LogOut size={16} /> {loggingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                </div>
            </aside>

            <div className="premium-content">
                <header className="premium-topbar">
                    <div className="topbar-start">
                        <button type="button" className="icon-action mobile-menu-toggle" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
                            <Menu size={22} />
                        </button>
                        <div className="topbar-breadcrumb">
                            <span>Workspace</span><ChevronRight size={15} /><strong>{page.label}</strong>
                        </div>
                    </div>
                    <div className="topbar-actions">
                        <button type="button" className="topbar-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search pages">
                            <Search size={17} /><span>Search pages...</span><kbd><Command size={12} /> K</kbd>
                        </button>
                        <button type="button" className="icon-action" title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={toggleTheme}>
                            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
                        </button>
                        <button type="button" className="icon-action" title="Notices" aria-label="Go to notices" onClick={() => navigate('/admin/notices')}>
                            <Bell size={19} />
                        </button>
                        <button type="button" className="topbar-profile" onClick={() => navigate('/admin/settings')} aria-label="Account settings">
                            <span>{initial}</span>
                            <span className="topbar-profile-name">{user?.name ?? 'Admin'}</span>
                        </button>
                    </div>
                </header>
                <main className="main premium-main" id="main-content">
                    <Outlet />
                </main>
            </div>

            {searchOpen && (
                <div className="command-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
                    <div className="command-panel" role="dialog" aria-modal="true" aria-label="Search workspace pages">
                        <div className="command-input-wrap">
                            <Search size={21} />
                            <input
                                ref={searchRef}
                                type="search"
                                value={query}
                                placeholder="Where would you like to go?"
                                aria-label="Search workspace pages"
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) openPage(results[0].to); }}
                            />
                            <button type="button" className="command-escape" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button>
                        </div>
                        <div className="command-results">
                            <div className="command-caption">PAGES</div>
                            {results.length === 0 && <div className="command-empty">No pages match your search.</div>}
                            {results.map(item => {
                                const Icon = item.icon;
                                return (
                                    <button type="button" key={item.to} className="command-result" onClick={() => openPage(item.to)}>
                                        <span><Icon size={17} />{item.label}</span><ChevronRight size={16} />
                                    </button>
                                );
                            })}
                        </div>
                        <div className="command-footer">Searches navigation pages, not customer or transaction records.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
