import type { AuthProfile } from '../types/auth';

let profileCache: AuthProfile | null = null;
let profileInflight: Promise<AuthProfile> | null = null;

export function getCachedAuthProfile(): AuthProfile | null {
  return profileCache;
}

export function getAuthProfileInflight(): Promise<AuthProfile> | null {
  return profileInflight;
}

export function setAuthProfileCache(profile: AuthProfile): void {
  profileCache = profile;
}

export function setAuthProfileInflight(promise: Promise<AuthProfile> | null): void {
  profileInflight = promise;
}

export function clearAuthProfileCache(): void {
  profileCache = null;
  profileInflight = null;
}
