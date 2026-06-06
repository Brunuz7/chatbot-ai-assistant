import { useState } from 'react';
import { ChevronDown, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { FieldControl } from '../ui/Input';
import { settingsControlClass } from './settingsUi';
import { getWeekdayShortLabel } from '../../constants/dateTime';
import {
  FULL_DAY_INTERVAL,
  MAX_INTERVALS_PER_DAY,
  appendDayInterval,
  formatIntervalDuration,
  minutesFromTime,
  type DaySchedule,
  type TimeInterval,
  type WeekdayKey,
} from '../../utils/workingHours';

const HOUR_MARKS = [0, 6, 12, 18, 24];

const DAY_PRESETS: { label: string; intervals: TimeInterval[] }[] = [
  { label: 'Comercial', intervals: [{ start: '09:00', end: '18:00' }] },
  { label: 'Manhã', intervals: [{ start: '08:00', end: '12:00' }] },
  { label: 'Dia inteiro', intervals: [{ ...FULL_DAY_INTERVAL }] },
];

export type SettingsDayScheduleRowProps = {
  dayKey: WeekdayKey;
  label: string;
  day: DaySchedule;
  disabled: boolean;
  onChange: (day: DaySchedule) => void;
};

export function SettingsDayScheduleRow({ dayKey, label, day, disabled, onChange }: SettingsDayScheduleRowProps) {
  const [expanded, setExpanded] = useState(day.enabled);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const patchInterval = (index: number, patch: Partial<TimeInterval>) => {
    const intervals = day.intervals.map((interval, i) => (i === index ? { ...interval, ...patch } : interval));
    onChange({ ...day, intervals });
  };

  const removeInterval = (index: number) => {
    if (day.intervals.length <= 1) return;
    onChange({ ...day, intervals: day.intervals.filter((_, i) => i !== index) });
    setActiveIndex(null);
  };

  const applyPreset = (intervals: TimeInterval[]) => {
    onChange({ ...day, enabled: true, intervals: intervals.map((interval) => ({ ...interval })) });
    setExpanded(true);
  };

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) setExpanded(true);
    onChange({ ...day, enabled });
  };

  const dayMinutes = 24 * 60;
  const isFullDay =
    day.enabled &&
    day.intervals.length === 1 &&
    day.intervals[0].start === FULL_DAY_INTERVAL.start &&
    day.intervals[0].end === FULL_DAY_INTERVAL.end;

  return (
    <article
      className={`rounded-xl border transition-all duration-200 ${
        day.enabled ? 'border-border bg-surface' : 'border-border bg-surface-muted'
      }`}>
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-3.5">
        <button
          type="button"
          disabled={disabled || !day.enabled}
          onClick={() => setExpanded((open) => !open)}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-a40 ${
            day.enabled ? 'cursor-pointer hover:bg-surface-hover' : 'cursor-default'
          } disabled:pointer-events-none`}
          aria-expanded={day.enabled ? expanded : false}
          aria-label={day.enabled ? `${expanded ? 'Recolher' : 'Expandir'} ${label}` : label}>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
              day.enabled ? 'bg-primary text-foreground-inverse' : 'bg-surface-inset text-foreground-muted'
            }`}
            aria-hidden>
            {getWeekdayShortLabel(dayKey)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-foreground-muted">
              {day.enabled
                ? isFullDay
                  ? 'Dia inteiro'
                  : `${day.intervals.length} intervalo${day.intervals.length === 1 ? '' : 's'}`
                : 'Inativo'}
            </p>
          </div>
          {day.enabled ? (
            <ChevronDown
              size={16}
              className={`shrink-0 text-foreground-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          ) : null}
        </button>
        <Switch
          checked={day.enabled}
          onCheckedChange={toggleEnabled}
          disabled={disabled}
          aria-label={`Ativar ${label}`}
        />
      </div>

      {day.enabled && expanded ? (
        <div className="space-y-3 border-t border-border-subtle px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5">
          <div>
            <div className="relative h-5 overflow-hidden rounded-md bg-surface-inset ring-1 ring-inset ring-border">
              {HOUR_MARKS.slice(1, -1).map((hour) => (
                <span
                  key={hour}
                  className="pointer-events-none absolute top-0 bottom-1 w-px bg-border-subtle"
                  style={{ left: `${(hour / 24) * 100}%` }}
                  aria-hidden
                />
              ))}
              {day.intervals.map((interval, index) => {
                const start = minutesFromTime(interval.start);
                const end = minutesFromTime(interval.end);
                const width = end > start ? ((end - start) / dayMinutes) * 100 : 0;
                const left = (start / dayMinutes) * 100;
                const highlighted = activeIndex === index;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`absolute top-0.5 bottom-0.5 rounded-sm transition-all duration-200 ${
                      highlighted ? 'bg-primary shadow-sm' : 'bg-primary-a50 hover:bg-primary'
                    }`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.75)}%` }}
                    title={`${interval.start} – ${interval.end}`}
                    aria-label={`Intervalo ${index + 1}: ${interval.start} até ${interval.end}`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between px-0.5 text-[10px] font-medium tabular-nums text-foreground-muted">
              {HOUR_MARKS.map((hour) => (
                <span key={hour}>{hour === 24 ? '24h' : `${hour}h`}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DAY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(preset.intervals)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-primary-a30 hover:bg-primary-a5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {day.intervals.map((interval, index) => (
              <div
                key={index}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex flex-wrap items-center gap-2 rounded-lg border p-2.5 transition-all duration-200 sm:gap-3 sm:p-3 ${
                  activeIndex === index
                    ? 'border-border bg-surface-hover'
                    : 'border-border bg-surface-muted'
                }`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-inset text-xs font-semibold text-foreground-muted">
                  {index + 1}
                </span>
                <FieldControl
                  type="time"
                  className="!w-[6.25rem] shrink-0 !rounded-lg !py-2"
                  value={interval.start}
                  disabled={disabled}
                  onChange={(e) => patchInterval(index, { start: e.target.value })}
                />
                <span className="shrink-0 text-xs font-medium text-foreground-muted">até</span>
                <FieldControl
                  type="time"
                  className="!w-[6.25rem] shrink-0 !rounded-lg !py-2"
                  value={interval.end}
                  disabled={disabled}
                  onChange={(e) => patchInterval(index, { end: e.target.value })}
                />
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-inset px-2 py-1 text-xs font-medium text-foreground-muted sm:ml-auto">
                  <Clock size={12} aria-hidden />
                  {formatIntervalDuration(interval.start, interval.end)}
                </span>
                {day.intervals.length > 1 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeInterval(index)}
                    className="shrink-0 rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-danger-muted hover:text-danger"
                    aria-label="Remover intervalo">
                    <Trash2 size={15} aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {day.intervals.length < MAX_INTERVALS_PER_DAY ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className={`gap-1.5 ${settingsControlClass}`}
              onClick={() => onChange(appendDayInterval(day))}>
              <Plus size={14} aria-hidden />
              Adicionar intervalo
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
