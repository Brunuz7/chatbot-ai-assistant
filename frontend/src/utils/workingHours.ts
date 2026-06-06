import { DEFAULT_TIMEZONE, WEEKDAYS, type WeekdayKey } from '../constants/dateTime';

export type { WeekdayKey };

export type TimeInterval = {
  start: string;
  end: string;
};

export type DaySchedule = {
  enabled: boolean;
  intervals: TimeInterval[];
};

export type WorkingHours = {
  timezone: string;
  days: Partial<Record<WeekdayKey, DaySchedule>>;
};

export const MAX_INTERVALS_PER_DAY = 4;
export const FULL_DAY_INTERVAL: TimeInterval = { start: '00:00', end: '23:59' };

const DEFAULT_INTERVAL: TimeInterval = { ...FULL_DAY_INTERVAL };
const DEFAULT_DAY: DaySchedule = { enabled: false, intervals: [{ ...DEFAULT_INTERVAL }] };

function parseTime(value: unknown, fallback: string): string {
  const t = typeof value === 'string' ? value.trim() : '';
  return /^\d{2}:\d{2}$/.test(t) ? t : fallback;
}

function parseIntervals(raw: unknown): TimeInterval[] {
  if (Array.isArray(raw)) {
    const parsed = raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          start: parseTime(row.start, FULL_DAY_INTERVAL.start),
          end: parseTime(row.end, FULL_DAY_INTERVAL.end),
        };
      })
      .slice(0, MAX_INTERVALS_PER_DAY);
    if (parsed.length > 0) return parsed;
  }

  if (raw && typeof raw === 'object') {
    const legacy = raw as Record<string, unknown>;
    if (typeof legacy.start === 'string' || typeof legacy.end === 'string') {
      return [
        {
          start: parseTime(legacy.start, FULL_DAY_INTERVAL.start),
          end: parseTime(legacy.end, FULL_DAY_INTERVAL.end),
        },
      ];
    }
  }

  return [{ ...DEFAULT_INTERVAL }];
}

function parseDay(raw: unknown): DaySchedule {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DAY, intervals: [{ ...DEFAULT_INTERVAL }] };
  const d = raw as Record<string, unknown>;
  return {
    enabled: d.enabled === true,
    intervals: parseIntervals(d.intervals ?? raw),
  };
}

export function defaultWorkingHours(): WorkingHours {
  return {
    timezone: DEFAULT_TIMEZONE,
    days: Object.fromEntries(
      WEEKDAYS.map(({ key }) => [key, { enabled: true, intervals: [{ ...FULL_DAY_INTERVAL }] }]),
    ) as WorkingHours['days'],
  };
}

export function parseWorkingHours(raw: unknown): WorkingHours {
  const base = defaultWorkingHours();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const timezone = typeof o.timezone === 'string' && o.timezone.trim() ? o.timezone.trim() : base.timezone;
  const daysIn = o.days && typeof o.days === 'object' ? (o.days as Record<string, unknown>) : {};
  const days = { ...base.days };
  for (const { key } of WEEKDAYS) {
    if (daysIn[key] !== undefined) days[key] = parseDay(daysIn[key]);
  }
  return { timezone, days };
}

export function appendDayInterval(day: DaySchedule): DaySchedule {
  if (day.intervals.length >= MAX_INTERVALS_PER_DAY) return day;
  const last = day.intervals[day.intervals.length - 1];
  const start = last?.end ?? '14:00';
  return {
    ...day,
    intervals: [...day.intervals, { start, end: '18:00' }],
  };
}

export function cloneDaySchedule(day: DaySchedule): DaySchedule {
  return {
    enabled: day.enabled,
    intervals: day.intervals.map((interval) => ({ ...interval })),
  };
}

export function minutesFromTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function formatIntervalDuration(start: string, end: string): string {
  const diff = minutesFromTime(end) - minutesFromTime(start);
  if (diff <= 0) return '—';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

