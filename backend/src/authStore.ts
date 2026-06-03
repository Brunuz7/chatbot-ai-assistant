import type { User } from '@prisma/client';
import { prisma, prismaRaw } from './lib/prisma.js';

export async function createUser(
  email: string,
  passwordHash: string,
  input?: { name?: string; company_name?: string; company_segment?: string; phone_number?: string },
): Promise<User> {
  const slug = email.split('@')[0].toLowerCase().replace(/\s+/g, '-');
  const name = input?.name;

  return prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      name: name || slug,
      slug,
      company_name: input?.company_name || null,
      company_segment: input?.company_segment || null,
      phone_number: input?.phone_number || null,
    },
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function saveRefreshToken(userId: string, token: string) {
  try {
    await prisma.refreshToken.create({ data: { token, user_id: userId } });
    return true;
  } catch (error) {
    console.error('Error saving refresh token:', error);
    return false;
  }
}

export async function removeRefreshToken(userId: string, token: string) {
  try {
    await prismaRaw.refreshToken.deleteMany({ where: { user_id: userId, token } });
    return true;
  } catch (error) {
    console.error('Error removing refresh token:', error);
    return false;
  }
}

export async function verifyRefreshToken(userId: string, token: string) {
  const rt = await prisma.refreshToken.findFirst({ where: { user_id: userId, token } });
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
