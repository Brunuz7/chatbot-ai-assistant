// import { Response } from "express";
// import type { AuthRequest } from "../types/auth.types.js";
// import { ContactService } from "../services/contactService.js";

// export class ContactController {
//   static async getContacts(req: AuthRequest, res: Response) {
//     try {
//       const userId = req.user?.sub;
//       if (!userId) {
//         return res.status(401).json({ error: "Usuário não autenticado" });
//       }

//       const contacts = await ContactService.listContacts(userId);
//       return res.json(contacts);
//     } catch (error) {
//       console.error("Erro ao buscar contatos:", error);
//       return res.status(500).json({ error: "Erro ao buscar contatos" });
//     }
//   }
// }


import { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import { ContactService } from "../services/contactService.js";

export class ContactController {
  static async getContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const contacts = await ContactService.listContacts(userId);
      return res.json(contacts);
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
      return res.status(500).json({ error: "Erro ao buscar contatos" });
    }
  }
}