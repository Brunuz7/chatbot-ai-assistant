// import { prisma } from "../lib/prisma.js";

// type DayConfig = {
//   open: string;
//   close: string;
//   closed: boolean;
// };

// type WorkingHours = {
//   [key: string]: DayConfig;
// };

// type LegacyWorkingHours = {
//   start?: string;
//   end?: string;
// };

// export class BusinessHoursService {

//   /*
//   ==========================================
//   HORÁRIO PADRÃO
//   ==========================================
//   */
//   private static buildDefaultHours(): WorkingHours {
//     return {
//       "0": { open: "08:00", close: "18:00", closed: true },
//       "1": { open: "08:00", close: "18:00", closed: false },
//       "2": { open: "08:00", close: "18:00", closed: false },
//       "3": { open: "08:00", close: "18:00", closed: false },
//       "4": { open: "08:00", close: "18:00", closed: false },
//       "5": { open: "08:00", close: "18:00", closed: false },
//       "6": { open: "08:00", close: "18:00", closed: true },
//     };
//   }

//   /*
//   ==========================================
//   CONVERTE HORA PARA MINUTOS
//   ==========================================
//   */
//   private static timeToMinutes(time: string): number {

//     const [hour = "0", minute = "0"] =
//       time.split(":");

//     return Number(hour) * 60 + Number(minute);
//   }

//   /*
//   ==========================================
//   CONVERTE FORMATO LEGADO
//   ==========================================
//   */
//   private static convertLegacyHours(
//     legacy: LegacyWorkingHours
//   ): WorkingHours {

//     const start = legacy.start || "08:00";
//     const end = legacy.end || "18:00";

//     return {
//       "0": { open: start, close: end, closed: true },
//       "1": { open: start, close: end, closed: false },
//       "2": { open: start, close: end, closed: false },
//       "3": { open: start, close: end, closed: false },
//       "4": { open: start, close: end, closed: false },
//       "5": { open: start, close: end, closed: false },
//       "6": { open: start, close: end, closed: false },
//     };
//   }

//   /*
//   ==========================================
//   BUSCAR CONFIGURAÇÕES
//   ==========================================
//   */
//   static async getHours(userId: string) {

//     let settings =
//       await prisma.user_setting.findUnique({
//         where: {
//           user_id: userId
//         },
//       });

//     /*
//     ==========================================
//     NÃO EXISTE CONFIG
//     ==========================================
//     */
//     if (!settings) {

//       settings =
//         await prisma.user_setting.create({
//           data: {
//             user_id: userId,
//             working_hours: this.buildDefaultHours(),
//             holidays: [],
//           },
//         });

//       return settings;
//     }

//     /*
//     ==========================================
//     TRATA JSON
//     ==========================================
//     */
//     const rawHours =
//       settings.working_hours as
//       WorkingHours |
//       LegacyWorkingHours |
//       null;

//     /*
//     ==========================================
//     FORMATO LEGADO
//     ==========================================
//     */
//     if (
//       rawHours &&
//       typeof rawHours === "object" &&
//       "start" in rawHours &&
//       "end" in rawHours
//     ) {

//       const legacy =
//         rawHours as LegacyWorkingHours;

//       if (
//         legacy.start &&
//         legacy.end &&
//         legacy.start !== "00:00" &&
//         legacy.end !== "00:00"
//       ) {

//         const converted =
//           this.convertLegacyHours(legacy);

//         return {
//           ...settings,
//           working_hours: converted,
//         };
//       }
//     }

//     return settings;
//   }

//   /*
//   ==========================================
//   ATUALIZAR HORÁRIOS
//   ==========================================
//   */
//   static async updateHours(
//     userId: string,
//     data: {
//       workingHours: WorkingHours;
//       holidays: string[];
//     }
//   ) {

//     const updated =
//       await prisma.user_setting.upsert({
//         where: {
//           user_id: userId
//         },

//         update: {
//           working_hours: data.workingHours,
//           holidays: data.holidays,
//         },

//         create: {
//           user_id: userId,
//           working_hours: data.workingHours,
//           holidays: data.holidays,
//         },
//       });

//     /*
//     ==========================================
//     LIMPA TRAVAS DE TODOS OS CONTATOS
//     ==========================================
//     */
//     await prisma.user_contact.updateMany({
//       where: {
//         user_id: userId
//       },

//       data: {
//         outside_hours_notified: false
//       }
//     });

//     return updated;
//   }

//   /*
//   ==========================================
//   PEGAR HORÁRIO DE HOJE
//   ==========================================
//   */
//   static async getTodayHours(
//     userId: string
//   ): Promise<DayConfig | null> {

//     const settings =
//       await this.getHours(userId);

//     const workingHours =
//       settings.working_hours as WorkingHours;

//     const nowBrazil =
//       new Date(
//         new Date().toLocaleString(
//           "en-US",
//           {
//             timeZone: "America/Sao_Paulo"
//           }
//         )
//       );

//     const currentDay =
//       String(nowBrazil.getDay());

//     return workingHours[currentDay] || null;
//   }

//   /*
//   ==========================================
//   VALIDAR HORÁRIO
//   ==========================================
//   */
//   static async isWithinWorkingHours(
//     userId: string
//   ): Promise<boolean> {

//     const settings =
//       await prisma.user_setting.findUnique({
//         where: {
//           user_id: userId
//         },
//       });

//     /*
//     ==========================================
//     SEM CONFIG
//     ==========================================
//     */
//     if (!settings?.working_hours) {
//       return true;
//     }

//     const rawHours =
//       settings.working_hours as
//       WorkingHours |
//       LegacyWorkingHours;

//     const nowBrazil =
//       new Date(
//         new Date().toLocaleString(
//           "en-US",
//           {
//             timeZone: "America/Sao_Paulo"
//           }
//         )
//       );

//     const currentHours =
//       nowBrazil.getHours();

//     const currentMinutes =
//       nowBrazil.getMinutes();

//     const currentTimeInMinutes =
//       currentHours * 60 + currentMinutes;

//     /*
//     ==========================================
//     FORMATO LEGADO
//     ==========================================
//     */
//     if (
//       rawHours &&
//       typeof rawHours === "object" &&
//       "start" in rawHours &&
//       "end" in rawHours
//     ) {

//       const legacyHours =
//         rawHours as LegacyWorkingHours;

//       const start =
//         legacyHours.start ?? "00:00";

//       const end =
//         legacyHours.end ?? "00:00";

//       if (
//         start === "00:00" ||
//         end === "00:00"
//       ) {

//         return false;
//       }

//       const startInMinutes =
//         this.timeToMinutes(start);

//       const endInMinutes =
//         this.timeToMinutes(end);

//       return (
//         currentTimeInMinutes >= startInMinutes &&
//         currentTimeInMinutes <= endInMinutes
//       );
//     }

//     /*
//     ==========================================
//     FORMATO POR DIA
//     ==========================================
//     */
//     const workingHours =
//       rawHours as WorkingHours;

//     const currentDay =
//       String(nowBrazil.getDay());

//     const todayConfig =
//       workingHours[currentDay];

//     /*
//     ==========================================
//     SEM CONFIG DO DIA
//     ==========================================
//     */
//     if (!todayConfig) {
//       return true;
//     }

//     /*
//     ==========================================
//     LOJA FECHADA
//     ==========================================
//     */
//     if (todayConfig.closed) {
//       return false;
//     }

//     /*
//     ==========================================
//     HORÁRIO INVÁLIDO
//     ==========================================
//     */
//     if (
//       !todayConfig.open ||
//       !todayConfig.close
//     ) {

//       return false;
//     }

//     const startInMinutes =
//       this.timeToMinutes(
//         todayConfig.open
//       );

//     const endInMinutes =
//       this.timeToMinutes(
//         todayConfig.close
//       );

//     return (
//       currentTimeInMinutes >= startInMinutes &&
//       currentTimeInMinutes <= endInMinutes
//     );
//   }

//   /*
//   ==========================================
//   CONTROLE DE FORA DO HORÁRIO
//   ==========================================
//   */
//   static async validateOutsideHours(
//     userId: string,
//     contactId: string
//   ) {

//     const isWithinHours =
//       await this.isWithinWorkingHours(
//         userId
//       );

//     const contact =
//       await prisma.user_contact.findUnique({
//         where: {
//           id: contactId
//         }
//       });

//     /*
//     ==========================================
//     CONTATO NÃO EXISTE
//     ==========================================
//     */
//     if (!contact) {

//       return {
//         canSendMessage: true,
//         shouldSendOutsideMessage: false
//       };
//     }

//     /*
//     ==========================================
//     LOJA ABERTA
//     ==========================================
//     */
//     if (isWithinHours) {

//       /*
//       ==========================================
//       REMOVE TRAVA AUTOMATICAMENTE
//       ==========================================
//       */
//       if (contact.outside_hours_notified) {

//         await prisma.user_contact.update({
//           where: {
//             id: contact.id
//           },

//           data: {
//             outside_hours_notified: false
//           }
//         });
//       }

//       return {
//         canSendMessage: true,
//         shouldSendOutsideMessage: false
//       };
//     }

//     /*
//     ==========================================
//     LOJA FECHADA
//     ==========================================
//     */

//     /*
//     ==========================================
//     JÁ NOTIFICADO
//     ==========================================
//     */
//     if (contact.outside_hours_notified) {

//       return {
//         canSendMessage: false,
//         shouldSendOutsideMessage: false
//       };
//     }

//     /*
//     ==========================================
//     PRIMEIRA INTERAÇÃO FORA DO HORÁRIO
//     ==========================================
//     */
//     await prisma.user_contact.update({
//       where: {
//         id: contact.id
//       },

//       data: {
//         outside_hours_notified: true
//       }
//     });

//     return {
//       canSendMessage: false,
//       shouldSendOutsideMessage: true
//     };
//   }
// }

import { prisma } from "../lib/prisma.js";
import { EvolutionService } from "./EvolutionService.js";

type DayConfig = {
  open: string;
  close: string;
  closed: boolean;
};

type WorkingHours = {
  [key: string]: DayConfig;
};

type LegacyWorkingHours = {
  start?: string;
  end?: string;
};

export class BusinessHoursService {

  /*
  ==========================================
  HORÁRIO PADRÃO
  ==========================================
  */
  private static buildDefaultHours(): WorkingHours {
    return {
      "0": { open: "08:00", close: "18:00", closed: true },
      "1": { open: "08:00", close: "18:00", closed: false },
      "2": { open: "08:00", close: "18:00", closed: false },
      "3": { open: "08:00", close: "18:00", closed: false },
      "4": { open: "08:00", close: "18:00", closed: false },
      "5": { open: "08:00", close: "18:00", closed: false },
      "6": { open: "08:00", close: "18:00", closed: true },
    };
  }

  /*
  ==========================================
  CONVERTE HORA PARA MINUTOS
  ==========================================
  */
  private static timeToMinutes(time: string): number {

    const [hour = "0", minute = "0"] =
      time.split(":");

    return Number(hour) * 60 + Number(minute);
  }

  /*
  ==========================================
  CONVERTE FORMATO LEGADO
  ==========================================
  */
  private static convertLegacyHours(
    legacy: LegacyWorkingHours
  ): WorkingHours {

    const start = legacy.start || "08:00";
    const end = legacy.end || "18:00";

    return {
      "0": { open: start, close: end, closed: true },
      "1": { open: start, close: end, closed: false },
      "2": { open: start, close: end, closed: false },
      "3": { open: start, close: end, closed: false },
      "4": { open: start, close: end, closed: false },
      "5": { open: start, close: end, closed: false },
      "6": { open: start, close: end, closed: false },
    };
  }

  /*
  ==========================================
  BUSCAR CONFIGURAÇÕES
  ==========================================
  */
  static async getHours(userId: string) {

    let settings =
      await prisma.user_setting.findUnique({
        where: {
          user_id: userId
        },
      });

    /*
    ==========================================
    NÃO EXISTE CONFIG
    ==========================================
    */
    if (!settings) {

      settings =
        await prisma.user_setting.create({
          data: {
            user_id: userId,
            working_hours: this.buildDefaultHours(),
            holidays: [],
          },
        });

      return settings;
    }

    /*
    ==========================================
    TRATA JSON
    ==========================================
    */
    const rawHours =
      settings.working_hours as
      WorkingHours |
      LegacyWorkingHours |
      null;

    /*
    ==========================================
    FORMATO LEGADO
    ==========================================
    */
    if (
      rawHours &&
      typeof rawHours === "object" &&
      "start" in rawHours &&
      "end" in rawHours
    ) {

      const legacy =
        rawHours as LegacyWorkingHours;

      if (
        legacy.start &&
        legacy.end &&
        legacy.start !== "00:00" &&
        legacy.end !== "00:00"
      ) {

        const converted =
          this.convertLegacyHours(legacy);

        return {
          ...settings,
          working_hours: converted,
        };
      }
    }

    return settings;
  }

  /*
  ==========================================
  ATUALIZAR HORÁRIOS (FIX TIMEZONE UTC)
  ==========================================
  */
  static async updateHours(
    userId: string,
    data: {
      workingHours: WorkingHours;
      holidays: string[];
    }
  ) {

    const updated =
      await prisma.user_setting.upsert({
        where: {
          user_id: userId
        },

        update: {
          working_hours: data.workingHours,
          holidays: data.holidays,
        },

        create: {
          user_id: userId,
          working_hours: data.workingHours,
          holidays: data.holidays,
        },
      });

    try {
      const nowBrazil = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentDay = String(nowBrazil.getDay());
      const todayConfig = data.workingHours[currentDay];

      if (todayConfig && !todayConfig.closed && todayConfig.close) {
        
        // 🔥 CORREÇÃO: Calcula 30 minutos atrás baseado no tempo absoluto UTC do Javascript
        const thirtyMinutesAgo = new Date(new Date().getTime() - 30 * 60 * 1000);

        const connection = await prisma.connection.findFirst({
          where: {
            user_id: userId,
            status: { in: ["CONNECTED", "open", "OPEN"] }
          }
        });

        if (connection) {
          const eligibleConversations = await prisma.conversation_state.findMany({
            where: {
              user_id: userId,
              paused: true,
              paused_reason: "outside_business_hours",
              updated_at: { // Corrigido para mapear dinamicamente o campo do prisma
                gte: thirtyMinutesAgo
              }
            }
          });

          for (const convo of eligibleConversations) {
            if (convo.whatsapp_id) {
              const alertMessage = 
                `Boas notícias! Passando para avisar que mudamos nosso horário de atendimento de hoje e *estendemos até as ${todayConfig.close}*. 🕒\n\n` +
                `Já estamos operacionais por aqui. Como posso te ajudar?`;

              await EvolutionService.sendMessage(connection.instance_id, {
                number: convo.whatsapp_id,
                text: alertMessage,
                delay: 1200,
                linkPreview: false
              }).catch(err => console.error("Erro ao enviar aviso de horário estendido:", err));

              await prisma.conversation_state.update({
                where: { id: convo.id },
                data: {
                  paused: false,
                  paused_reason: null,
                  pending_message: null
                }
              }).catch(() => {});
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar avisos proativos de alteração de horário:", error);
    }

    /*
    ==========================================
    LIMPA TRAVAS DE TODOS OS CONTATOS
    ==========================================
    */
    await prisma.user_contact.updateMany({
      where: {
        user_id: userId
      },

      data: {
        outside_hours_notified: false
      }
    });

    return updated;
  }

  /*
  ==========================================
  PEGAR HORÁRIO DE HOJE
  ==========================================
  */
  static async getTodayHours(
    userId: string
  ): Promise<DayConfig | null> {

    const settings =
      await this.getHours(userId);

    const workingHours =
      settings.working_hours as WorkingHours;

    const nowBrazil =
      new Date(
        new Date().toLocaleString(
          "en-US",
          {
            timeZone: "America/Sao_Paulo"
          }
        )
      );

    const currentDay =
      String(nowBrazil.getDay());

    return workingHours[currentDay] || null;
  }

  /*
  ==========================================
  VALIDAR HORÁRIO
  ==========================================
  */
  static async isWithinWorkingHours(
    userId: string
  ): Promise<boolean> {

    const settings =
      await prisma.user_setting.findUnique({
        where: {
          user_id: userId
        },
      });

    /*
    ==========================================
    SEM CONFIG
    ==========================================
    */
    if (!settings?.working_hours) {
      return true;
    }

    const rawHours =
      settings.working_hours as
      WorkingHours |
      LegacyWorkingHours;

    const nowBrazil =
      new Date(
        new Date().toLocaleString(
          "en-US",
          {
            timeZone: "America/Sao_Paulo"
          }
        )
      );

    const currentHours =
      nowBrazil.getHours();

    const currentMinutes =
      nowBrazil.getMinutes();

    const currentTimeInMinutes =
      currentHours * 60 + currentMinutes;

    /*
    ==========================================
    FORMATO LEGADO
    ==========================================
    */
    if (
      rawHours &&
      typeof rawHours === "object" &&
      "start" in rawHours &&
      "end" in rawHours
    ) {

      const legacyHours =
        rawHours as LegacyWorkingHours;

      const start =
        legacyHours.start ?? "00:00";

      const end =
        legacyHours.end ?? "00:00";

      if (
        start === "00:00" ||
        end === "00:00"
      ) {

        return false;
      }

      const startInMinutes =
        this.timeToMinutes(start);

      const endInMinutes =
        this.timeToMinutes(end);

      return (
        currentTimeInMinutes >= startInMinutes &&
        currentTimeInMinutes <= endInMinutes
      );
    }

    /*
    ==========================================
    FORMATO POR DIA
    ==========================================
    */
    const workingHours =
      rawHours as WorkingHours;

    const currentDay =
      String(nowBrazil.getDay());

    const todayConfig =
      workingHours[currentDay];

    /*
    ==========================================
    SEM CONFIG DO DIA
    ==========================================
    */
    if (!todayConfig) {
      return true;
    }

    /*
    ==========================================
    LOJA FECHADA
    ==========================================
    */
    if (todayConfig.closed) {
      return false;
    }

    /*
    ==========================================
    HORÁRIO INVÁLIDO
    ==========================================
    */
    if (
      !todayConfig.open ||
      !todayConfig.close
    ) {

      return false;
    }

    const startInMinutes =
      this.timeToMinutes(
        todayConfig.open
      );

    const endInMinutes =
      this.timeToMinutes(
        todayConfig.close
      );

    return (
      currentTimeInMinutes >= startInMinutes &&
      currentTimeInMinutes <= endInMinutes
    );
  }

  /*
  ==========================================
  CONTROLE DE FORA DO HORÁRIO
  ==========================================
  */
  static async validateOutsideHours(
    userId: string,
    contactId: string
  ) {

    const isWithinHours =
      await this.isWithinWorkingHours(
        userId
      );

    const contact =
      await prisma.user_contact.findUnique({
        where: {
          id: contactId
        }
      });

    /*
    ==========================================
    CONTATO NÃO EXISTE
    ==========================================
    */
    if (!contact) {

      return {
        canSendMessage: true,
        shouldSendOutsideMessage: false
      };
    }

    /*
    ==========================================
    LOJA ABERTA
    ==========================================
    */
    if (isWithinHours) {

      /*
      ==========================================
      REMOVE TRAVA AUTOMATICAMENTE
      ==========================================
      */
      if (contact.outside_hours_notified) {

        await prisma.user_contact.update({
          where: {
            id: contact.id
          },

          data: {
            outside_hours_notified: false
          }
        });
      }

      return {
        canSendMessage: true,
        shouldSendOutsideMessage: false
      };
    }

    /*
    ==========================================
    LOJA FECHADA
    ==========================================
    */

    /*
    ==========================================
    JÁ NOTIFICADO
    ==========================================
    */
    if (contact.outside_hours_notified) {

      return {
        canSendMessage: false,
        shouldSendOutsideMessage: false
      };
    }

    /*
    ==========================================
    PRIMEIRA INTERAÇÃO FORA DO HORÁRIO
    ==========================================
    */
    await prisma.user_contact.update({
      where: {
        id: contact.id
      },

      data: {
        outside_hours_notified: true
      }
    });

    return {
      canSendMessage: false,
      shouldSendOutsideMessage: true
    };
  }
}