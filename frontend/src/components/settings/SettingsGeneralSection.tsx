import { ThemePreferencePicker } from '../theme/ThemePreferencePicker';
import { SettingsRow, SettingsSection } from './SettingsPanelCard';

export function SettingsGeneralSection() {
  return (
    <SettingsSection
      title="Aparência"
      description="Tema claro, escuro ou automático.">
      <SettingsRow
        label="Modo de cor"
        description="Escolha entre tema claro, escuro ou automático. A alteração é aplicada imediatamente neste navegador."
        control={<ThemePreferencePicker />}
      />
    </SettingsSection>
  );
}
