import React from 'react';
import { Input, Select, TextArea } from '../ui/Input';
import type { FlowFormState } from './FlowWizardSteps';

type FlowWizardActionFieldsProps = {
  formData: FlowFormState;
  setFormData: React.Dispatch<React.SetStateAction<FlowFormState>>;
  siblingFlows: { id: string; name: string }[];
};

export function FlowWizardActionFields({ formData, setFormData, siblingFlows }: FlowWizardActionFieldsProps) {
  const setMeta = (patch: Record<string, unknown>) =>
    setFormData({ ...formData, metadata: { ...formData.metadata, ...patch } });

  switch (formData.type) {
    case 'send_message':
    case 'message':
      return (
        <TextArea
          label="Texto da mensagem"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Olá! Como podemos ajudar?"
          rows={3}
        />
      );
    case 'send_voice':
      return (
        <div className="space-y-2">
          <TextArea
            label="Texto que será lido em voz"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Olá! Como podemos ajudar?"
            rows={3}
          />
          <p className="text-sm leading-normal text-slate-500">
            A voz usada está em <strong className="font-medium">Configurações → Resposta em áudio</strong>.
          </p>
        </div>
      );
    case 'wait_reply':
      return (
        <TextArea
          label="Mensagem enquanto espera (opcional)"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Ex.: Pode responder quando quiser."
          rows={2}
        />
      );
    case 'goto':
      return (
        <Select
          label="Qual etapa seguir"
          value={String(formData.metadata.target_flow_id ?? formData.next_flow_id ?? '')}
          onChange={(e) => {
            const id = e.target.value;
            setFormData({
              ...formData,
              next_flow_id: id,
              metadata: { ...formData.metadata, target_flow_id: id },
            });
          }}>
          <option value="">Escolha a etapa…</option>
          {siblingFlows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      );
    case 'interpret':
    case 'interpret_voice':
      return (
        <div className="space-y-2">
          <TextArea
            label="O que a IA deve fazer aqui"
            value={String(formData.metadata.extract_instruction ?? '')}
            onChange={(e) => setMeta({ extract_instruction: e.target.value })}
            placeholder="Ex.: seja simpático e peça o número do pedido."
            rows={3}
          />
          {formData.type === 'interpret_voice' ? (
            <p className="text-sm leading-normal text-slate-500">
              A resposta será enviada em áudio. Configure a voz em{' '}
              <strong className="font-medium">Configurações → Resposta em áudio</strong>.
            </p>
          ) : null}
        </div>
      );
    case 'condition':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Se a mensagem do cliente…"
            value={String(formData.metadata.operator ?? 'contains')}
            onChange={(e) => setMeta({ operator: e.target.value })}>
            <option value="contains">Contiver o texto</option>
            <option value="equals">For igual ao texto</option>
          </Select>
          <Input
            label="Texto"
            value={String(formData.metadata.value ?? '')}
            onChange={(e) => setMeta({ value: e.target.value })}
            placeholder="ex.: sim"
          />
          <Select
            label="Então ir para"
            value={String(formData.metadata.true_flow_id ?? '')}
            onChange={(e) => setMeta({ true_flow_id: e.target.value })}>
            <option value="">—</option>
            {siblingFlows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select
            label="Senão, ir para"
            value={String(formData.metadata.false_flow_id ?? '')}
            onChange={(e) => setMeta({ false_flow_id: e.target.value })}>
            <option value="">—</option>
            {siblingFlows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
      );
    case 'handover':
      return (
        <TextArea
          label="Mensagem para o cliente"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Um atendente vai continuar a conversa em breve."
          rows={2}
        />
      );
    default:
      return null;
  }
}
