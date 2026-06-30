export interface AuthResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  type: string;
}

export interface JwtAuthenticatedUser {
  id: string;
  username: string;
  email: string;
}
