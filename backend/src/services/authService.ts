import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken as verifyRefreshTokenToken } from '../auth.js';
import { createUser, findUserByEmail, findUserById, saveRefreshToken, removeRefreshToken, verifyRefreshToken as storeVerifyRefresh, increaseFailedAttempts, resetFailedAttempts } from '../authStore.js';

export class AuthService {
  static async register(email: string, passwordHash: string, name?: string) {
    const user = await createUser(email, passwordHash, name);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  static async login(email: string, password?: string) {
    if (!email || !password) throw new Error('invalid_input');
    
    const user = await findUserByEmail(email);
    if (!user) throw new Error('invalid_credentials');
    
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      throw new Error('account_locked');
    }
    
    const ok = await comparePassword(password, user.passwordHash);
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
    if (!(await storeVerifyRefresh(userId, token))) {
      throw new Error('invalid_refresh_store');
    }
    
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
      if (payload) {
        await removeRefreshToken(payload.sub, token);
      }
    }
  }

  static async getUserProfile(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');
    return { id: user.id, email: user.email, name: user.name };
  }
}
