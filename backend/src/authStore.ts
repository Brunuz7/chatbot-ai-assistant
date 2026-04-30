import { prisma } from './lib/prisma.js';


export interface User {
  id: string;
  name?: string | null;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: number | null;
}

export async function createUser(email: string, passwordHash: string, name?: string) {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });
  return {
    ...user,
    lockedUntil: user.lockedUntil?.getTime() || null,
  };
}

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return { ...user, lockedUntil: user.lockedUntil?.getTime() || null };
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return { ...user,  lockedUntil: user.lockedUntil?.getTime() || null };
}

export async function saveRefreshToken(userId: string, token: string) {
  try {
    await prisma.refreshToken.create({ data: { token, userId } });
    return true;
  } catch (error) {
    console.error('Error saving refresh token:', error);
    return false;
  }
}

export async function removeRefreshToken(userId: string, token: string) {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId, token } });
    return true;
  } catch (error) {
    console.error('Error removing refresh token:', error);
    return false;
  }
}

export async function verifyRefreshToken(userId: string, token: string) {
  const rt = await prisma.refreshToken.findFirst({ where: { userId, token } });
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
