// import { prisma } from "../lib/prisma.js";

// export class ContactService {
//   /**
//    * Lista contatos ativos e remove o bloqueio automático de quem já expirou o tempo
//    */
//   static async listContacts(userId: string) {
//     // 1. Atualiza automaticamente os contatos cujo tempo de bloqueio já venceu
//     await prisma.user_contact.updateMany({
//       where: {
//         user_id: userId,
//         blocked: true,
//         blocked_until: {
//           not: null,
//           lte: new Date(),
//         },
//       },
//       data: {
//         blocked: false,
//         block_reason: null,
//         blocked_at: null,
//         blocked_until: null,
//       },
//     });

//     // 2. Retorna a lista de contatos ativos
//     return prisma.user_contact.findMany({
//       where: {
//         user_id: userId,
//         blocked: false,
//       },
//       orderBy: {
//         created_at: "desc",
//       },
//     });
//   }

//   /**
//    * Lista apenas os contatos bloqueados
//    */
//   static async listBlockedContacts(userId: string) {
//     return prisma.user_contact.findMany({
//       where: {
//         user_id: userId,
//         blocked: true,
//       },
//       orderBy: {
//         updated_at: "desc",
//       },
//     });
//   }

//   /**
//    * Bloqueia um contato com base em ID e prioridades de tempo
//    */
//   static async blockContact(
//     id: string,
//     userId: string,
//     data: { reason?: string; blockHours?: number; blockedUntil?: string }
//   ) {
//     const existingContact = await prisma.user_contact.findFirst({
//       where: { id, user_id: userId },
//     });

//     if (!existingContact) {
//       throw new Error("contact_not_found");
//     }

//     let finalBlockedUntil: Date | null = null;

//     // Prioridade 1: Envio de data manual pelo frontend
//     if (data.blockedUntil) {
//       finalBlockedUntil = new Date(data.blockedUntil);
//     } 
//     // Prioridade 2: Fallback para blockHours
//     else if (data.blockHours) {
//       finalBlockedUntil = new Date();
//       finalBlockedUntil.setHours(finalBlockedUntil.getHours() + Number(data.blockHours));
//     } 
//     // Prioridade 3: Padrão de 24 horas
//     else {
//       finalBlockedUntil = new Date();
//       finalBlockedUntil.setHours(finalBlockedUntil.getHours() + 24);
//     }

//     return prisma.user_contact.update({
//       where: { id },
//       data: {
//         blocked: true,
//         block_reason: data.reason || "Bloqueado manualmente",
//         blocked_at: new Date(),
//         blocked_until: finalBlockedUntil,
//       },
//     });
//   }

//   /**
//    * Desbloqueia manualmente um contato
//    */
//   static async unblockContact(id: string, userId: string) {
//     const existingContact = await prisma.user_contact.findFirst({
//       where: { id, user_id: userId },
//     });

//     if (!existingContact) {
//       throw new Error("contact_not_found");
//     }

//     return prisma.user_contact.update({
//       where: { id },
//       data: {
//         blocked: false,
//         block_reason: null,
//         blocked_at: null,
//         blocked_until: null,
//       },
//     });
//   }
// }


import { prisma } from "../lib/prisma.js";

export class ContactService {
  /**
   * Lista contatos ativos e remove o bloqueio automático de quem já expirou o tempo
   */
  static async listContacts(userId: string) {
    // 1. Atualiza automaticamente apenas quem tem prazo de validade (not: null) e já venceu (lte: new Date())
    // Isso protege os bloqueios permanentes (null) para que nunca sejam limpos sozinhos
    await prisma.userContact.updateMany({
      where: {
        user_id: userId,
        blocked: true,
        blocked_until: {
          not: null,       // Ignora bloqueios permanentes
          lte: new Date(), // Filtra apenas os temporários já vencidos
        },
      },
      data: {
        blocked: false,
        block_reason: null,
        blocked_at: null,
        blocked_until: null,
      },
    });

    // 2. Retorna a lista de contatos ativos
    return prisma.userContact.findMany({
      where: {
        user_id: userId,
        blocked: false,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }
}