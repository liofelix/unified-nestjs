export interface AuthResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  type: string;
  jti: string;
  exp: number;
}

export interface JwtAuthenticatedUser {
  id: string;
  username: string;
  email: string;
  tokenId: string;
  expiresAt: number;
}
