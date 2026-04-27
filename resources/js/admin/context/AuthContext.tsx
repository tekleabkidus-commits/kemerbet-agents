import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import axios from 'axios';
import api, { getCsrfCookie } from '@/api';

export interface Admin {
    id: number;
    email: string;
    name: string;
    created_at?: string;
}

interface LoginResult {
    ok: boolean;
    error?: string;
}

interface AuthContextValue {
    user: Admin | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/api/admin/me')
            .then((res) => setUser(res.data.user))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    async function login(email: string, password: string): Promise<LoginResult> {
        try {
            await getCsrfCookie();
            const res = await api.post('/api/admin/login', { email, password });
            setUser(res.data.user);
            return { ok: true };
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                const status = err.response.status;
                if (status === 422) {
                    const errors = err.response.data.errors as Record<string, string[]>;
                    const firstError = Object.values(errors)[0]?.[0] ?? 'Validation failed.';
                    return { ok: false, error: firstError };
                }
                if (status === 429) {
                    return { ok: false, error: 'Too many attempts. Please wait a moment.' };
                }
                if (status === 401) {
                    return { ok: false, error: 'Invalid credentials.' };
                }
                return { ok: false, error: err.response.data.message ?? 'Something went wrong. Please try again.' };
            }
            return { ok: false, error: 'Network error. Please try again.' };
        }
    }

    async function logout(): Promise<void> {
        await api.post('/api/admin/logout');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
