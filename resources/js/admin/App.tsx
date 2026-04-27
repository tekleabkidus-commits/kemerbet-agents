import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicOnlyRoute from '@/components/PublicOnlyRoute';
import AdminLayout from '@/components/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AgentsPage from '@/pages/AgentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import PaymentMethodsPage from '@/pages/PaymentMethodsPage';
import SettingsPage from '@/pages/SettingsPage';
import ActivityPage from '@/pages/ActivityPage';

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
                            <Route path="/admin/analytics" element={<AnalyticsPage />} />
                            <Route path="/admin/payment-methods" element={<PaymentMethodsPage />} />
                            <Route path="/admin/settings" element={<SettingsPage />} />
                            <Route path="/admin/activity" element={<ActivityPage />} />
                        </Route>
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
