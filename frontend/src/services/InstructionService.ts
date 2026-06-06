import api from './api';
import type { Instruction, SaveInstructionPayload } from '../types/instruction';

export class InstructionService {
  async get(): Promise<Instruction | null> {
    const { data } = await api.get<Instruction | null>('/instructions');
    return data;
  }

  async save(payload: SaveInstructionPayload): Promise<void> {
    await api.put('/instructions', payload);
  }
}

export const instructionService = new InstructionService();
