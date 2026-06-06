export interface Instruction {
  content: string;
}

export type SaveInstructionPayload = {
  content: string;
  is_active: boolean;
};
