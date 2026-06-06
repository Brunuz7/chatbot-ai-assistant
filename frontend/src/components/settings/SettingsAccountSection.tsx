import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input, PhoneInput, Select } from '../ui/Input';
import { FormBlockSkeleton } from '../ui/Skeleton';
import { SettingsRow, SettingsSection } from './SettingsPanelCard';
import { COMPANY_SEGMENTS } from '../../constants/companySegments';
import { normalizePhoneDigits } from '../../utils/phoneMask';
import type { AuthProfile, UpdateProfilePayload } from '../../types/auth';

export const settingsAccountFormId = 'settings-account-form';

export type SettingsAccountSectionProps = {
  loading: boolean;
  saving: boolean;
  profile: AuthProfile | null;
  onSave: (payload: UpdateProfilePayload) => void;
};

export function SettingsAccountSection({ loading, saving, profile, onSave }: SettingsAccountSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySegment, setCompanySegment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setEmail(profile.email ?? '');
    setCompanyName(profile.company_name ?? '');
    setCompanySegment(profile.company_segment ?? '');
    setPhoneNumber(profile.phone_number ?? '');
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySegment) {
      toast.error('Selecione o segmento da empresa.');
      return;
    }
    const phone = normalizePhoneDigits(phoneNumber);
    if (phone && (phone.length < 12 || phone.length > 13)) {
      toast.error('Informe um telefone válido com DDD.');
      return;
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      company_name: companyName.trim() || undefined,
      company_segment: companySegment,
      phone_number: phone || undefined,
    });
  };

  return (
    <SettingsSection title="Conta" description="Dados da sua conta no painel.">
      {loading ? (
        <div className="py-5">
          <FormBlockSkeleton rows={4} />
        </div>
      ) : (
        <form id={settingsAccountFormId} onSubmit={handleSubmit}>
          <SettingsRow
            label="Nome"
            control={
              <Input
                type="text"
                className="!rounded-lg w-full"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                required
              />
            }
          />
          <SettingsRow
            label="E-mail"
            control={
              <Input
                type="email"
                className="!rounded-lg w-full"
                value={email}
                disabled={saving}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            }
          />
          <SettingsRow
            label="Empresa"
            control={
              <Input
                type="text"
                className="!rounded-lg w-full"
                value={companyName}
                disabled={saving}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
              />
            }
          />
          <SettingsRow
            label="Segmento"
            description="Área de atuação da sua empresa."
            control={
              <Select
                className="!rounded-lg w-full"
                value={companySegment}
                disabled={saving}
                onChange={(e) => setCompanySegment(e.target.value)}
                required>
                <option value="" disabled>
                  Selecione…
                </option>
                {COMPANY_SEGMENTS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            }
          />
          <SettingsRow
            label="Telefone"
            description="Com DDD. Usado para contacto de suporte."
            control={
              <PhoneInput
                className="!rounded-lg w-full"
                value={phoneNumber}
                disabled={saving}
                onChange={setPhoneNumber}
                placeholder="+55 (00) 00000-0000"
                autoComplete="tel"
              />
            }
          />
        </form>
      )}
    </SettingsSection>
  );
}
