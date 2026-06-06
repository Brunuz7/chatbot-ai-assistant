function stripEnv(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getEvolutionApiUrl(): string | undefined {
  return stripEnv(process.env.EVOLUTION_API_URL);
}

export function getEvolutionApiKey(): string | undefined {
  return stripEnv(process.env.EVOLUTION_API_KEY);
}

export function isEvolutionConfigured(): boolean {
  return Boolean(getEvolutionApiUrl() && getEvolutionApiKey());
}

export function getWebhookUrl(): string {
  return (
    stripEnv(process.env.WEBHOOK_URL) ||
    `http://localhost:${process.env.PORT || 3001}/webhook/evolution`
  );
}
