import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { ROUTES } from '@/app/router/routes';
import type { ApiErrorResponse } from '@/types/api.types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetryConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return api(original);
      } catch {
        if (window.location.pathname !== ROUTES.login) {
          window.location.href = ROUTES.login;
        }
      }
    }

    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): ApiErrorResponse | null {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'object' && data !== null && 'success' in data && data.success === false) {
      return data as ApiErrorResponse;
    }
  }
  return null;
}
