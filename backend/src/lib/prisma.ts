import { Prisma, PrismaClient } from '@prisma/client';
import { modelUsesSoftDelete, withNotDeleted } from './softDelete.js';

const logConfig =
  process.env.NODE_ENV === 'development' ? (['query', 'error', 'warn'] as const) : (['error'] as const);

const baseClient = new PrismaClient({ log: [...logConfig] });

const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (modelUsesSoftDelete(model)) {
          args.where = withNotDeleted(args.where as Record<string, unknown> | undefined);
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (modelUsesSoftDelete(model)) {
          args.where = withNotDeleted(args.where as Record<string, unknown> | undefined);
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        const row = await query(args);
        if (
          modelUsesSoftDelete(model) &&
          row &&
          typeof row === 'object' &&
          'deleted_at' in row &&
          row.deleted_at != null
        ) {
          return null;
        }
        return row;
      },
      async count({ model, args, query }) {
        if (modelUsesSoftDelete(model)) {
          args.where = withNotDeleted(args.where as Record<string, unknown> | undefined);
        }
        return query(args);
      },
      async delete({ model, args }) {
        if (!modelUsesSoftDelete(model)) {
          const delegate = (baseClient as unknown as Record<string, { delete: (a: unknown) => Promise<unknown> }>)[
            model
          ];
          return delegate.delete(args);
        }
        const delegate = (baseClient as unknown as Record<string, { update: (a: unknown) => Promise<unknown> }>)[
          model
        ];
        return delegate.update({
          where: args.where,
          data: { deleted_at: new Date() },
        });
      },
      async deleteMany({ model, args }) {
        if (!modelUsesSoftDelete(model)) {
          const delegate = (baseClient as unknown as Record<
            string,
            { deleteMany: (a: unknown) => Promise<unknown> }
          >)[model];
          return delegate.deleteMany(args);
        }
        const delegate = (baseClient as unknown as Record<
          string,
          { updateMany: (a: unknown) => Promise<unknown> }
        >)[model];
        return delegate.updateMany({
          where: withNotDeleted(args.where as Record<string, unknown> | undefined),
          data: { deleted_at: new Date() },
        });
      },
    },
  },
});

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient>;
  prismaRaw: PrismaClient;
};

function createExtendedClient() {
  return baseClient.$extends(softDeleteExtension);
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

/** Cliente com soft delete nas entidades de negócio. */
export const prisma = globalForPrisma.prisma ?? createExtendedClient();

/** Cliente sem extensão — tokens, fila webhook, purga de conversas. */
export const prismaRaw = globalForPrisma.prismaRaw ?? baseClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRaw = prismaRaw;
}
