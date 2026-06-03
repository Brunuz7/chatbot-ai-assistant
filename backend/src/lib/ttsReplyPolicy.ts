/** Áudio só quando o fluxo pede (forceAudio) e TTS está activo nas configurações. */
export function shouldReplyWithAudio(params: {
  enabled: boolean;
  /** Ação de fluxo «Enviar áudio» ou «Responder em áudio». */
  force?: boolean;
}): boolean {
  return params.force === true && params.enabled;
}
