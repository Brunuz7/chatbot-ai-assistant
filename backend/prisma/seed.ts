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
    create: {
      name,
      slug,
      email,
      passwordHash: hashedPassword,
    },
  });

  // Mock Connection
  await prisma.connection.upsert({
    where: { instanceId: 'Evolution_API_Main' },
    update: {},
    create: {
      name: 'WhatsApp Principal',
      instanceId: 'Evolution_API_Main',
      status: 'DISCONNECTED',
      userId: user.id
    }
  });

  // Mock Contacts
  const contacts = [
    { name: 'João Silva', number: '5511999999999', tags: 'VIP' },
    { name: 'Maria Souza', number: '5511888888888', tags: 'Lead' },
    { name: 'Pedro Santos', number: '5511777777777', tags: 'Suporte' },
  ];

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { number: contact.number },
      update: {},
      create: contact
    });
  }

  // Mock Automations
  const automations = [
    { name: 'Boas-vindas', trigger: 'NEW_CONTACT', actions: 'Send hello message', isActive: true },
    { name: 'Fora de Horário', trigger: 'OFF_HOURS', actions: 'Send wait message', isActive: true },
  ];

  for (const auto of automations) {
    await prisma.automation.upsert({
      where: { id: `mock-${auto.name}` },
      update: {},
      create: { ...auto, id: `mock-${auto.name}` }
    });
  }

  // Mock Message Logs
  await prisma.messageLog.create({
    data: { from: '5511999999999', to: 'bot', content: 'Olá', status: 'received' }
  });
  await prisma.messageLog.create({
    data: { from: 'bot', to: '5511999999999', content: 'Olá! Como posso ajudar?', status: 'sent' }
  });
  await prisma.messageLog.create({
    data: { from: '5511888888888', to: 'bot', content: 'Quero saber mais', status: 'received' }
  });

  console.log('Seed: Dados de teste criados com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
