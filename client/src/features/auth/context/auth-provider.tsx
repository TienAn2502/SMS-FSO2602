import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';

import { fetchMe, login, logout } from '../api/auth-api';
import type { LoginInput } from '../types';

import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const meQuery = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchMe,
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: (session) => {
            queryClient.setQueryData(['auth', 'me'], session);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            queryClient.setQueryData(['auth', 'me'], null);
            queryClient.clear();
        },
    });

    const handleLogin = useCallback(
        async (input: LoginInput) => {
            return loginMutation.mutateAsync(input);
        },
        [loginMutation],
    );

    const handleLogout = useCallback(async () => {
        await logoutMutation.mutateAsync();
    }, [logoutMutation]);

    const refetch = useCallback(async () => {
        await meQuery.refetch();
    }, [meQuery]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session: meQuery.data ?? null,
            isLoading: meQuery.isLoading,
            isAuthenticated: Boolean(meQuery.data),
            socketInfo: meQuery.data?.socketInfo ?? null,
            login: handleLogin,
            logout: handleLogout,
            refetch,
            test: 123,
        }),
        [meQuery.data, meQuery.isLoading, handleLogin, handleLogout, refetch],
    );

    console.log('meQuery.data', meQuery.data);

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
