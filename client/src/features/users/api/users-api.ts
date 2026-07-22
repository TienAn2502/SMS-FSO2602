import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  UserRole,
  UserStatus,
} from '@/types/api.types';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
}

export async function fetchUsers(params: ListUsersParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<User>>('/users', {
    params,
  });
  return { items: data.data, meta: data.meta };
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<ApiSuccessResponse<User>>('/users', input);
  return data.data;
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<User> {
  const { data } = await api.patch<ApiSuccessResponse<User>>(
    `/users/${id}/status`,
    { status },
  );
  return data.data;
}
