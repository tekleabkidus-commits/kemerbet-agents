import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicOnlyRoute from '@/components/PublicOnlyRoute';
import AdminLayout from '@/components/AdminLayout';
import LoginPage from '@/pages/LoginPage';

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
                            <Route path="/admin" element={<div>Dashboard (TODO)</div>} />
                            <Route path="/admin/agents" element={<div>Agents (TODO)</div>} />
                            <Route path="/admin/analytics" element={<div>Analytics (TODO)</div>} />
                            <Route path="/admin/payment-methods" element={<div>Payment Methods (TODO)</div>} />
                            <Route path="/admin/settings" element={<div>Settings (TODO)</div>} />
                            <Route path="/admin/activity" element={<div>Activity (TODO)</div>} />
                        </Route>
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
