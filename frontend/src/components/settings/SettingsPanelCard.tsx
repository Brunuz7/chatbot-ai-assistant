import type { ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { FloatingDock } from '../ui/FloatingDock';
import { ModalFloatingButton } from '../ui/Modal';
import { settingsRowDescClass, settingsSectionDescClass, settingsSectionTitleClass } from './settingsUi';

export type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Cabeçalho de secção no estilo GitHub Settings. */
export function SettingsSection({ title, description, children, className = '' }: SettingsSectionProps) {
  return (
    <section className={`w-full space-y-0 ${className}`}>
      <header className="border-b border-border pb-3">
        <h2 className={settingsSectionTitleClass}>{title}</h2>
        {description ? <p className={settingsSectionDescClass}>{description}</p> : null}
      </header>
      <div className="w-full">{children}</div>
    </section>
  );
}

export type SettingsRowProps = {
  label: string;
  description?: ReactNode;
  control: ReactNode;
  /** Linha ocupa largura total (ex.: textarea, grade de horários). */
  stacked?: boolean;
};

/** Linha label/descrição à esquerda, controlo à direita — padrão GitHub Settings. */
export function SettingsRow({ label, description, control, stacked = false }: SettingsRowProps) {
  if (stacked) {
    return (
      <div className="w-full space-y-3 py-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description ? <div className={settingsRowDescClass}>{description}</div> : null}
        </div>
        <div>{control}</div>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-3 py-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-start sm:gap-x-8">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <div className={settingsRowDescClass}>{description}</div> : null}
      </div>
      <div className="min-w-0 w-full">{control}</div>
    </div>
  );
}

/** @deprecated Use SettingsSection — mantido para compatibilidade durante migração. */
export type SettingsPanelCardProps = SettingsSectionProps;

/** @deprecated Use SettingsSection */
export function SettingsPanelCard(props: SettingsSectionProps) {
  return <SettingsSection {...props} />;
}

export type SettingsSaveBarProps = {
  label: string;
  saving?: boolean;
  disabled?: boolean;
  visible?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  onClick?: () => void;
};

/** Botão de salvar flutuante, centrado na coluna de conteúdo de Configurações. */
export function SettingsSaveBar({
  label,
  saving = false,
  disabled = false,
  visible = true,
  type = 'button',
  form,
  onClick,
}: SettingsSaveBarProps) {
  return (
    <FloatingDock visible={visible} align="settings-content">
      <ModalFloatingButton type={type} form={form} disabled={disabled || saving} onClick={onClick}>
        {saving ? (
          <Loader2 size={18} className="animate-spin" aria-hidden />
        ) : (
          <Check size={18} strokeWidth={2.25} aria-hidden />
        )}
        {saving ? 'Salvando…' : label}
      </ModalFloatingButton>
    </FloatingDock>
  );
}
