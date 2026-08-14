import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicOnlyRoute from '@/components/PublicOnlyRoute';
import AdminLayout from '@/components/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AgentsPage from '@/pages/AgentsPage';
import OverviewPage from '@/pages/analytics/OverviewPage';
import AgentsAnalyticsPage from '@/pages/analytics/AgentsAnalyticsPage';
import CustomersPage from '@/pages/analytics/CustomersPage';
import CoveragePage from '@/pages/analytics/CoveragePage';
import PaymentMethodsPage from '@/pages/PaymentMethodsPage';
import SettingsPage from '@/pages/SettingsPage';
import NoticesPage from '@/pages/NoticesPage';
import ActivityPage from '@/pages/ActivityPage';

// Old /admin/analytics URL keeps working — forward to Overview with filters.
function AnalyticsRedirect() {
    const location = useLocation();
    return <Navigate to={`/admin/analytics/overview${location.search}`} replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route element={<PublicOnlyRoute />}>
                        <Route path="/admin/login" element={<LoginPage />} />
                    </Route>
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route path="/admin" element={<DashboardPage />} />
                            <Route path="/admin/agents" element={<AgentsPage />} />
                            <Route path="/admin/analytics" element={<AnalyticsRedirect />} />
                            <Route path="/admin/analytics/overview" element={<OverviewPage />} />
                            <Route path="/admin/analytics/agents" element={<AgentsAnalyticsPage />} />
                            <Route path="/admin/analytics/customers" element={<CustomersPage />} />
                            <Route path="/admin/analytics/coverage" element={<CoveragePage />} />
                            <Route path="/admin/payment-methods" element={<PaymentMethodsPage />} />
                            <Route path="/admin/settings" element={<SettingsPage />} />
                            <Route path="/admin/notices" element={<NoticesPage />} />
                            <Route path="/admin/activity" element={<ActivityPage />} />
                        </Route>
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
