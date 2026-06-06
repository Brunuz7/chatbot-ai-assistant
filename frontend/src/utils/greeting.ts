export type TimeOfDayGreeting = 'Bom dia' | 'Boa tarde' | 'Boa noite';

/** Saudação conforme o horário local (pt-BR). */
export function getTimeOfDayGreeting(date = new Date()): TimeOfDayGreeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Primeira letra maiúscula; o restante em minúsculas. */
export function formatDisplayName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

export function getDisplayFirstName(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return formatDisplayName(first);
  }
  const mail = email?.trim();
  if (mail) {
    const local = mail.split('@')[0]?.trim();
    if (local) return formatDisplayName(local);
  }
  return 'Usuário';
}

export function buildUserGreeting(name?: string | null, email?: string | null, date = new Date()): string {
  return `${getTimeOfDayGreeting(date)}, ${getDisplayFirstName(name, email)}!`;
}
