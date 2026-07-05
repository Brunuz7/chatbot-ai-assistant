import '../src/lib/loadRootEnv.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.com';
  const name = 'Admin';
  const password = 'admin';
  const slug = 'admin';
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({ 
    where: { email },
    update: {},
    create: { name, slug, email, password_hash: hashedPassword },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
