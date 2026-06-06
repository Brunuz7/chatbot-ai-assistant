import type { Request } from 'express';
import type { Agent, Flow, Prisma, UserSetting } from '@prisma/client';

/** Request Express com utilizador autenticado (JWT). */
export interface AuthRequest extends Request {
  user?: { sub: string; email: string };
}

export type AccessTokenPayload = { sub: string; email: string; iat: number; exp: number };

export type UpdateProfileBody = {
  name?: string;
  email?: string;
  company_name?: string | null;
  company_segment?: string;
  phone_number?: string | null;
  password?: string;
};

export type RefreshTokenPayload = { sub: string; jti: string; iat: number; exp: number };

/** Valores aceites para `UserSetting.tts_voice_type`. */
export type TtsVoiceType = 'preset' | 'clone';

export type UpdateTtsReplyBody = Partial<
  Pick<UserSetting, 'tts_voice_type' | 'tts_voice' | 'tts_model' | 'tts_max_chars'>
>;

export type TimeIntervalInput = { start: string; end: string };

export type DayScheduleInput = {
  enabled: boolean;
  intervals: TimeIntervalInput[];
};

export type WorkingHoursInput = {
  timezone: string;
  days: Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayScheduleInput>>;
};

export type UpdateScheduleBody = {
  delay_seconds?: number;
  working_hours?: WorkingHoursInput;
};

export type TtsReplySettings = Pick<
  UserSetting,
  'tts_voice_type' | 'tts_voice' | 'tts_model' | 'tts_max_chars' | 'mistral_voice_id'
> & { has_cloned_voice: boolean };

export type FlowWithRelations = Prisma.FlowGetPayload<{ include: { agent: true } }>;

export type FlowResolved = FlowWithRelations;

export type FlowCtx = Record<string, unknown>;

export type OutboundText = {
  kind: 'text';
  text: string;
  delayMs?: number;
  /** Fluxo pediu entrega em áudio (TTS), independente do modo global. */
  forceAudio?: boolean;
};

export type OutboundMessage = OutboundText;

export type FlowProcessResult = {
  outbound: OutboundMessage[];
  /** Fluxo em pausa aguardando resposta (ex.: wait_reply). */
  flowResume: { flowId: string } | null;
};

export type InboundFlowParams = {
  flow: FlowWithRelations;
  agent: Agent | null;
  userId: string;
  incomingText: string;
  whatsappId: string;
  outbound: OutboundMessage[];
  loadFlow: (flowId: string) => Promise<FlowWithRelations | null>;
};

export type InboundFlowRunResult = {
  loop: 'continue' | 'break';
  nextFlowId: string | null;
  inboundForWait: string;
};

export type InboundFlowHandler = (params: InboundFlowParams) => Promise<InboundFlowRunResult>;

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

export type FlowChoiceCandidate = Pick<Flow, 'id' | 'name' | 'priority' | 'entry_instruction'>;

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

export type FlowWriteData = {
  name?: string;
  agent_id?: string | null;
  is_active?: boolean;
  entry_mode?: string;
  entry_instruction?: string | null;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  type?: string;
  content?: string | null;
  next_flow_id?: string | null;
  metadata?: unknown;
};
