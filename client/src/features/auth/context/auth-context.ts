import { createContext } from 'react';

import type { AuthSession, LoginInput, UserSocketInfo } from '../types';

export interface AuthContextValue {
    session: AuthSession | null;
    socketInfo: UserSocketInfo | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (input: LoginInput) => Promise<AuthSession>;
    logout: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
