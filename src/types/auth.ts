/** Claims embedded in access tokens issued by this service. */
export interface JwtAccessPayload {
  sub: string;
  email?: string;
  nickname?: string;
  roleKey?: string;
  roleLevel?: number;
}

/** Authenticated user attached to `ctx.state.user` after JWT verification. */
export interface AuthUser {
  id: string;
  email?: string;
  nickname?: string;
  roleKey?: string;
  roleLevel?: number;
}

export interface AuthUserProfile {
  id: number;
  email: string;
  nickname: string;
  roleKey: string;
  roleName: string;
  roleLevel: number;
}

/** Metadata written by the auth middleware for downstream handlers. */
export interface AuthState {
  tokenPresent: boolean;
  verified?: boolean;
  devBypass?: boolean;
}
