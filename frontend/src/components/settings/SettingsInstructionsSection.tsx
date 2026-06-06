import { TextArea } from '../ui/Input';
import { FormBlockSkeleton } from '../ui/Skeleton';
import { SettingsRow, SettingsSection } from './SettingsPanelCard';

export type SettingsInstructionsSectionProps = {
  loading: boolean;
  saving: boolean;
  content: string;
  onContentChange: (value: string) => void;
};

export function SettingsInstructionsSection({
  loading,
  saving,
  content,
  onContentChange,
}: SettingsInstructionsSectionProps) {
  return (
    <SettingsSection
      title="Instruções globais"
      description="Instruções aplicadas a todas as respostas da IA.">
      {loading ? (
        <div className="py-5">
          <FormBlockSkeleton rows={4} />
        </div>
      ) : (
        <SettingsRow
          stacked
          label="Conteúdo da instrução"
          description="Ex.: responder de forma objetiva, em tom profissional e sem gírias."
          control={
            <TextArea
              rows={10}
              className="min-h-[220px] !rounded-lg"
              placeholder="Escreva as instruções globais para a IA…"
              value={content}
              disabled={saving}
              onChange={(e) => onContentChange(e.target.value)}
            />
          }
        />
      )}
    </SettingsSection>
  );
}
