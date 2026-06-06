import { Briefcase, Sun, Sunrise } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { FormBlockSkeleton } from '../ui/Skeleton';
import { SettingsDayScheduleRow } from './SettingsDayScheduleRow';
import { SettingsRow, SettingsSection } from './SettingsPanelCard';
import { settingsControlClass, settingsMutedPanelClass } from './settingsUi';
import { TIMEZONES, WEEKDAY_BUSINESS_KEYS, WEEKDAYS, type WeekdayKey } from '../../constants/dateTime';
import {
  FULL_DAY_INTERVAL,
  cloneDaySchedule,
  type DaySchedule,
  type WorkingHours,
} from '../../utils/workingHours';

const DEFAULT_DAY: DaySchedule = { enabled: false, intervals: [{ ...FULL_DAY_INTERVAL }] };

const DELAY_MARKS = [0, 15, 30, 60, 120, 300, 600];

export type SettingsScheduleSectionProps = {
  loading: boolean;
  saving: boolean;
  delaySeconds: number;
  workingHours: WorkingHours;
  onDelaySecondsChange: (value: number) => void;
  onWorkingHoursChange: (value: WorkingHours) => void;
};

export function SettingsScheduleSection({
  loading,
  saving,
  delaySeconds,
  workingHours,
  onDelaySecondsChange,
  onWorkingHoursChange,
}: SettingsScheduleSectionProps) {
  const patchDay = (key: WeekdayKey, day: DaySchedule) => {
    onWorkingHoursChange({
      ...workingHours,
      days: { ...workingHours.days, [key]: day },
    });
  };

  const patchDays = (patch: Partial<Record<WeekdayKey, DaySchedule>>) => {
    onWorkingHoursChange({
      ...workingHours,
      days: { ...workingHours.days, ...patch },
    });
  };

  const enableWeekdaysOnly = () => {
    const next: Partial<Record<WeekdayKey, DaySchedule>> = {};
    for (const { key } of WEEKDAYS) {
      const current = workingHours.days[key] ?? DEFAULT_DAY;
      next[key] = {
        ...cloneDaySchedule(current),
        enabled: WEEKDAY_BUSINESS_KEYS.includes(key),
      };
    }
    patchDays(next);
  };

  const disableAllDays = () => {
    const next: Partial<Record<WeekdayKey, DaySchedule>> = {};
    for (const { key } of WEEKDAYS) {
      const current = workingHours.days[key] ?? DEFAULT_DAY;
      next[key] = { ...cloneDaySchedule(current), enabled: false };
    }
    patchDays(next);
  };

  const enableAllDaysFull = () => {
    const next: Partial<Record<WeekdayKey, DaySchedule>> = {};
    for (const { key } of WEEKDAYS) {
      next[key] = { enabled: true, intervals: [{ ...FULL_DAY_INTERVAL }] };
    }
    patchDays(next);
  };

  return (
    <SettingsSection
      title="Horário de resposta"
      description="Atraso de resposta e dias disponíveis.">
      {loading ? (
        <div className="py-5">
          <FormBlockSkeleton rows={8} />
        </div>
      ) : (
        <>
          <SettingsRow
            stacked
            label="Atraso antes de responder"
            description="Tempo de espera após receber uma mensagem antes de o assistente responder."
            control={
              <div className={`p-4 ${settingsMutedPanelClass}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">Intervalo</span>
                  <span className="rounded-md bg-primary-a10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-primary">
                    {delaySeconds}s
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={600}
                  step={5}
                  disabled={saving}
                  value={delaySeconds}
                  onChange={(e) => onDelaySecondsChange(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-primary"
                  aria-label="Atraso antes de responder em segundos"
                />
                <div className="mt-2 flex justify-between text-[10px] font-medium text-foreground-muted">
                  {DELAY_MARKS.map((mark) => (
                    <span key={mark}>{mark === 0 ? '0s' : mark < 60 ? `${mark}s` : `${mark / 60}m`}</span>
                  ))}
                </div>
              </div>
            }
          />

          <SettingsRow
            label="Fuso horário"
            description="Referência para calcular os horários de disponibilidade."
            control={
              <Select
                className="!rounded-lg w-full"
                value={workingHours.timezone}
                disabled={saving}
                onChange={(e) => onWorkingHoursChange({ ...workingHours, timezone: e.target.value })}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            }
          />

          <SettingsRow
            stacked
            label="Dias e horários"
            description={
              <span className="inline-flex items-center gap-1.5">
                <Sun size={14} aria-hidden />
                Clique na barra ou nos intervalos para destacar; use os atalhos para preencher rápido.
              </span>
            }
            control={
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    className={`${settingsControlClass} !border-border !bg-surface !font-medium !text-foreground-muted hover:!border-primary-a30 hover:!bg-primary-a5 hover:!text-primary`}
                    onClick={enableWeekdaysOnly}>
                    <Briefcase size={14} aria-hidden />
                    Dias úteis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    className={`${settingsControlClass} !border-border !bg-surface !font-medium !text-foreground-muted hover:!border-primary-a30 hover:!bg-primary-a5 hover:!text-primary`}
                    onClick={enableAllDaysFull}>
                    <Sunrise size={14} aria-hidden />
                    Todos os dias
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    className={`${settingsControlClass} !border-border !bg-surface !font-medium !text-foreground-muted hover:!border-primary-a30 hover:!bg-primary-a5 hover:!text-primary`}
                    onClick={disableAllDays}>
                    Limpar
                  </Button>
                </div>
                <div className="grid gap-2.5">
                  {WEEKDAYS.map(({ key, label }) => (
                    <SettingsDayScheduleRow
                      key={key}
                      dayKey={key}
                      label={label}
                      day={workingHours.days[key] ?? DEFAULT_DAY}
                      disabled={saving}
                      onChange={(day) => patchDay(key, day)}
                    />
                  ))}
                </div>
              </div>
            }
          />
        </>
      )}
    </SettingsSection>
  );
}
