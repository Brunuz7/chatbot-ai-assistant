/** Formatação para UI (pt-BR). */

export function formatNumberPt(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function formatDateTimePt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valor para `<input type="datetime-local" />` (agendamento). */
export function defaultDateTimeLocalValue(minAheadMinutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minAheadMinutes + 1);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
