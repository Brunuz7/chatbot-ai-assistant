import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  verifyRefreshToken as verifyRefreshTokenToken,
} from '../auth.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  saveRefreshToken,
  removeRefreshToken,
  verifyRefreshToken as storeVerifyRefresh,
  increaseFailedAttempts,
  resetFailedAttempts,
  updateUserProfile as persistUserProfile,
} from '../authStore.js';
import type { UpdateProfileBody } from '../types/index.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export class AuthService {
  static async register(
    email: string,
    passwordHash: string,
    input?: { name?: string; company_name?: string; company_segment?: string; phone_number?: string },
  ) {
    const user = await createUser(email, passwordHash, input);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  static async login(email: string, password?: string) {
    if (!email || !password) throw new Error('invalid_input');

    const user = await findUserByEmail(email);
    if (!user) throw new Error('invalid_credentials');
    if (user.locked_until && user.locked_until > new Date()) throw new Error('account_locked');

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      await increaseFailedAttempts(user.id);
      throw new Error('invalid_credentials');
    }

    await resetFailedAttempts(user.id);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  static async refresh(token: string) {
    const payload = verifyRefreshTokenToken(token);
    if (!payload) throw new Error('invalid_refresh');

    const userId = payload.sub;
    if (!(await storeVerifyRefresh(userId, token))) throw new Error('invalid_refresh_store');

    const user = await findUserById(userId);
    if (!user) throw new Error('unknown_user');

    // rotate refresh token
    await removeRefreshToken(userId, token);
    const newRefresh = generateRefreshToken(user);
    await saveRefreshToken(userId, newRefresh);
    const accessToken = generateAccessToken(user);

    return { accessToken, refreshToken: newRefresh };
  }

  static async logout(token?: string) {
    if (token) {
      const payload = verifyRefreshTokenToken(token);
      if (payload) await removeRefreshToken(payload.sub, token);
    }
  }

  static async getUserProfile(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      company_name: user.company_name,
      company_segment: user.company_segment,
      phone_number: user.phone_number,
    };
  }

  static async updateUserProfile(userId: string, body: UpdateProfileBody) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');

    const name = String(body.name ?? user.name).trim();
    const email = normalizeEmail(String(body.email ?? user.email));
    const companyNameRaw = body.company_name !== undefined ? String(body.company_name ?? '').trim() : user.company_name;
    const company_name = companyNameRaw ? companyNameRaw.slice(0, 120) : null;
    const company_segment = String(body.company_segment ?? user.company_segment ?? '').trim();
    const phoneRaw = body.phone_number !== undefined ? normalizePhoneDigits(String(body.phone_number ?? '')) : user.phone_number ?? '';
    const phone_number = phoneRaw ? phoneRaw.slice(0, 20) : null;
    const password = String(body.password ?? '').trim();

    if (!name) throw new Error('invalid_input');
    if (!email || !email.includes('@')) throw new Error('invalid_input');
    if (!company_segment) throw new Error('invalid_input');
    if (phone_number && (phone_number.length < 12 || phone_number.length > 13)) throw new Error('invalid_phone');
    if (password && password.length < 6) throw new Error('invalid_password');

    if (email !== normalizeEmail(user.email)) {
      const existing = await findUserByEmail(email);
      if (existing && existing.id !== userId) throw new Error('user_exists');
    }

    const password_hash = password ? await hashPassword(password) : undefined;

    await persistUserProfile(userId, {
      name: name.slice(0, 120),
      email,
      company_name,
      company_segment: company_segment.slice(0, 64),
      phone_number,
      password_hash,
    });

    return this.getUserProfile(userId);
  }
}
