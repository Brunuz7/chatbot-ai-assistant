// import { prisma } from "../lib/prisma.js";

// export class BlockedService {
//   /**
//    * Lista apenas os contatos que estão atualmente bloqueados
//    */
//   static async listBlocked(userId: string) {
//     return prisma.user_contact.findMany({
//       where: {
//         user_id: userId,
//         blocked: true
//       },
//       orderBy: {
//         updated_at: "desc"
//       }
//     });
//   }

//   /**
//    * Bloqueia um contato aplicando as regras de prioridade de tempo
//    */
//   static async block(
//     id: string,
//     userId: string,
//     data: { reason?: string; blockHours?: number; blockedUntil?: string }
//   ) {
//     const existingContact = await prisma.user_contact.findFirst({
//       where: { id, user_id: userId }
//     });

//     if (!existingContact) {
//       throw new Error("contact_not_found");
//     }

//     let finalBlockedUntil: Date | null = null;

//     // Prioridade 1: Se o frontend enviou uma data manual específica
//     if (data.blockedUntil) {
//       finalBlockedUntil = new Date(data.blockedUntil);
//     } 
//     // Prioridade 2: Fallback calculando a partir das horas informadas
//     else if (data.blockHours) {
//       finalBlockedUntil = new Date();
//       finalBlockedUntil.setHours(finalBlockedUntil.getHours() + Number(data.blockHours));
//     } 
//     // Prioridade 3: Fallback padrão de 24 horas
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
//         blocked_until: finalBlockedUntil
//       }
//     });
//   }

//   /**
//    * Desbloqueia manualmente um contato
//    */
//   static async unblock(id: string, userId: string) {
//     const existingContact = await prisma.user_contact.findFirst({
//       where: { id, user_id: userId }
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
//         blocked_until: null
//       }
//     });
//   }
// }
import { prisma } from "../lib/prisma.js";

export class BlockedService {
  /**
   * Lista apenas os contatos que estão atualmente bloqueados
   */
  static async listBlocked(userId: string) {
    return prisma.user_contact.findMany({
      where: {
        user_id: userId,
        blocked: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });
  }

  /**
   * Bloqueia um contato tratando regras estritas de Temporário vs Permanente
   */
  static async block(
    id: string,
    userId: string,
    data: { reason?: string; blockHours?: number | string; blockedUntil?: string }
  ) {
    const existingContact = await prisma.user_contact.findFirst({
      where: { id, user_id: userId },
    });

    if (!existingContact) {
      throw new Error("contact_not_found");
    }

    let finalBlockedUntil: Date | null = null;

    // 1. Limpeza de strings vazias vindas do frontend
    const cleanBlockedUntil = data.blockedUntil && data.blockedUntil.trim() !== "" ? data.blockedUntil : null;
    const parsedHours = data.blockHours !== undefined && data.blockHours !== null ? Number(data.blockHours) : null;

    // Prioridade 1: Envio de data manual específica (Temporário)
    if (cleanBlockedUntil) {
      finalBlockedUntil = new Date(cleanBlockedUntil);
    } 
    // Prioridade 2: Se vieram horas válidas e maiores que zero (Temporário)
    else if (parsedHours !== null && !isNaN(parsedHours) && parsedHours > 0) {
      finalBlockedUntil = new Date();
      finalBlockedUntil.setHours(finalBlockedUntil.getHours() + parsedHours);
    } 
    // Prioridade 3: BLOQUEIO PERMANENTE
    // Se não houver data válida e as horas forem 0, nulas ou negativas, salva NULL no banco
    else {
      finalBlockedUntil = null;
    }

    console.log(`[BLOQUEIO] Contato: ${id} | Horas: ${parsedHours} | Data: ${cleanBlockedUntil} | Resultado final_blocked_until:`, finalBlockedUntil);

    return prisma.user_contact.update({
      where: { id },
      data: {
        blocked: true,
        block_reason: data.reason || "Bloqueado manualmente",
        blocked_at: new Date(),
        blocked_until: finalBlockedUntil, // Grava NULL se for permanente
      },
    });
  }

  /**
   * Desbloqueia manualmente um contato
   */
  static async unblock(id: string, userId: string) {
    const existingContact = await prisma.user_contact.findFirst({
      where: { id, user_id: userId },
    });

    if (!existingContact) {
      throw new Error("contact_not_found");
    }

    return prisma.user_contact.update({
      where: { id },
      data: {
        blocked: false,
        block_reason: null,
        blocked_at: null,
        blocked_until: null,
      },
    });
  }
}