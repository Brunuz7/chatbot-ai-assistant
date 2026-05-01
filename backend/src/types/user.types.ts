export interface User {
  id: string;
  name?: string | null;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: number | null;
}
