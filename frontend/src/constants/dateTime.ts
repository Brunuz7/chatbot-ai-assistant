/** Fusos horários disponíveis no painel (`value` = identificador IANA). */
export const TIMEZONES = [{ value: 'America/Sao_Paulo', label: '(GMT-03:00) Brasília' }] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]['value'];

export const DEFAULT_TIMEZONE: TimezoneValue = TIMEZONES[0].value;

/** Dias da semana: chave em inglês (`key`), rótulos em português. */
export const WEEKDAYS = [
  { key: 'mon', label: 'Segunda-feira', shortLabel: 'SEG' },
  { key: 'tue', label: 'Terça-feira', shortLabel: 'TER' },
  { key: 'wed', label: 'Quarta-feira', shortLabel: 'QUA' },
  { key: 'thu', label: 'Quinta-feira', shortLabel: 'QUI' },
  { key: 'fri', label: 'Sexta-feira', shortLabel: 'SEX' },
  { key: 'sat', label: 'Sábado', shortLabel: 'SÁB' },
  { key: 'sun', label: 'Domingo', shortLabel: 'DOM' },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]['key'];

export const WEEKDAY_BUSINESS_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

export function getWeekdayLabel(key: WeekdayKey): string {
  return WEEKDAYS.find((day) => day.key === key)?.label ?? key;
}

export function getWeekdayShortLabel(key: WeekdayKey): string {
  return WEEKDAYS.find((day) => day.key === key)?.shortLabel ?? key;
}
