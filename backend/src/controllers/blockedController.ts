import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class BlockedController {
    static async list(req: Request, res: Response) {
        const contacts = await prisma.blockedContact.findMany({
            orderBy: { blockerTime: 'desc' }
        });
        res.json(contacts);
    }

    static async block(req: Request, res: Response) {
        const { phoneNumber, observation } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                message: 'Número de telefone é obrigatório'
            });
        }

        const exists = await prisma.blockedContact.findUnique({
            where: { phoneNumber }
        });

        if (exists) {
            return res.status(400).json({
                message: 'Contact already blocked'
            });
        }

        const blocked = await prisma.blockedContact.create({
            data: {
                phoneNumber,
                observation
            }
        });

        res.status(201).json(blocked);
    }

    static async unblock(req: Request, res: Response) {

    try {
        const { id } = req.params;

        const result = await prisma.blockedContact.delete({
            where: {
                id: String(id)
            }
        });

        return res.json({
            message: 'Contact unblocked successfully',
            contact: result
        });

        } catch (error) {
            return res.status(500).json({
                message: 'Error occurred while unblocking contact'
            });
        }

    }
}