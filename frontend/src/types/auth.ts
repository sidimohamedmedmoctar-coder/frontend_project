export interface LoginResponse {
  'access-token': string;
}

export interface DecodedJwt {
  sub: string;
  scope: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  username: string;
  roles: string[];
  token: string;
}
