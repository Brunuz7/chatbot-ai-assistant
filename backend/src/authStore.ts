import { prisma } from './lib/prisma.js';
import type { User } from './types/user.types.js';

export async function createUser(email: string, passwordHash: string, name?: string): Promise<User> {
  const slug = email.split('@')[0].toLowerCase().replace(/\s+/g, '-');

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      name: name || slug,
      slug,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    failedAttempts: user.failed_attempts,
    lockedUntil: user.locked_until?.getTime() || null,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    failedAttempts: user.failed_attempts,
    lockedUntil: user.locked_until?.getTime() || null,
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    failedAttempts: user.failed_attempts,
    lockedUntil: user.locked_until?.getTime() || null,
  };
}

export async function saveRefreshToken(userId: string, token: string) {
  try {
    await prisma.refresh_token.create({ data: { token, user_id: userId } });
    return true;
  } catch (error) {
    console.error('Error saving refresh token:', error);
    return false;
  }
}

export async function removeRefreshToken(userId: string, token: string) {
  try {
    await prisma.refresh_token.deleteMany({ where: { user_id: userId, token } });
    return true;
  } catch (error) {
    console.error('Error removing refresh token:', error);
    return false;
  }
}

export async function verifyRefreshToken(userId: string, token: string) {
  const rt = await prisma.refresh_token.findFirst({ where: { user_id: userId, token } });
  return !!rt;
}

export async function increaseFailedAttempts(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const failedAttempts = user.failed_attempts + 1;
  let lockedUntil = user.locked_until;

  if (failedAttempts >= 5) lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId }, 
    data: { failed_attempts: failedAttempts, locked_until: lockedUntil },
  });
}

export async function resetFailedAttempts(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { failed_attempts: 0, locked_until: null } });
}
