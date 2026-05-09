
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.Connection.findMany();
  console.log('Connections:', JSON.stringify(connections, null, 2));
  const users = await prisma.User.findMany();
  console.log('Users:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
