import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const agent = await prisma.agent.findFirst();
    if (!agent) {
      console.log('No agents found');
      return;
    }
    console.log('Using agent:', agent.id);

    const result = await prisma.$transaction(async (tx) => {
      const flow = await tx.flow.create({
        data: {
          name: 'Fluxo Principal',
          agent_id: agent.id,
          is_active: true,
        }
      });

      const steps = [
        {
          key: 'step_1',
          type: 'message',
          content: 'Nova Mensagem',
          next_step: '',
          metadata: {}
        }
      ];

      if (steps.length > 0) {
        await tx.flow_step.createMany({
          data: steps.map((s: any) => ({
            flow_id: flow.id,
            key: s.key,
            type: s.type,
            content: s.content,
            next_step: s.next_step,
            metadata: s.metadata || {}
          }))
        });
      }

      return tx.flow.findUnique({ where: { id: flow.id }, include: { steps: true } });
    });

    console.log('Success:', result);
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
