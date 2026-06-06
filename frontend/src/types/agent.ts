export interface Agent {
  id: string;
  name: string;
  role: string;
  objective: string;
  instructions: string;
}

export interface AgentSummary {
  id: string;
  name: string;
}

export type AgentPayload = Omit<Agent, 'id'>;
