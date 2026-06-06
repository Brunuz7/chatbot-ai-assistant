import type { DashboardStatsPeriod } from '../types/dashboard.js';

function formatDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

type MessageEntry = { direction?: string; timestamp?: string };

export function dashboardPeriodRange(period: DashboardStatsPeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (period === 'week') from.setDate(from.getDate() - 6);
  else if (period === 'month') from.setDate(from.getDate() - 29);
  return { from, to };
}

export function dashboardPreviousPeriodRange(period: DashboardStatsPeriod): { from: Date; to: Date } {
  const { from: currentFrom } = dashboardPeriodRange(period);
  const to = new Date(currentFrom);
  to.setMilliseconds(-1);

  if (period === 'day') {
    const from = new Date(currentFrom);
    from.setDate(from.getDate() - 1);
    return { from, to };
  }

  if (period === 'week') {
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  const from = new Date(to);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function dashboardChartRange(period: DashboardStatsPeriod): { from: Date; to: Date; dayCount: number } {
  const to = new Date();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const dayCount = period === 'month' ? 30 : 7;
  from.setDate(from.getDate() - (dayCount - 1));
  return { from, to, dayCount };
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function countOutboundInPeriod(messages: unknown, from: Date, to: Date): number {
  return countMessagesInPeriod(messages, from, to, 'out');
}

export function countMessagesInPeriod(
  messages: unknown,
  from: Date,
  to: Date,
  direction?: 'in' | 'out',
): number {
  if (!Array.isArray(messages)) return 0;
  let n = 0;
  for (const raw of messages) {
    const m = raw as MessageEntry;
    if (direction && m.direction !== direction) continue;
    const ts = m.timestamp ? new Date(m.timestamp) : null;
    if (!ts || Number.isNaN(ts.getTime())) continue;
    if (ts >= from && ts <= to) n += 1;
  }
  return n;
}

export function buildConversationsByDay(
  timestamps: Date[],
  from: Date,
  dayCount: number,
): { date: string; label: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const ts of timestamps) {
    const key = ts.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: formatDayLabel(date),
    count,
  }));
}
