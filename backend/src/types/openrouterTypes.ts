export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type RequestCompletiontParams = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type ExtractJsonParams = {
  systemPrompt: string;
  userText: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type FlowChoiceCandidate = {
  id: string;
  name: string;
  priority: number;
  trigger_keywords: unknown;
  trigger_intents: unknown;
};

export type ResolveFlowParams = {
  incomingText: string;
  flows: FlowChoiceCandidate[];
  model?: string;
};

export type TranscribeAudioParams = {
  base64: string;
  format: string;
  model?: string;
};

export type SynthesizeSpeechParams = {
  text: string;
  voice: string;
  model?: string;
};
