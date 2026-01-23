export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string | null;
  name: string;
  iat?: number;
  exp?: number;
}
