import type { User } from '@prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: User['role'];
  status: User['status'];
  createdAt: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
