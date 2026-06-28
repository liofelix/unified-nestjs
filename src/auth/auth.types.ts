import { UserResponse } from '../users/users.service';

export enum JwtTokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  type: JwtTokenType;
}

export interface JwtAuthenticatedUser {
  id: string;
  username: string;
  email: string;
}
