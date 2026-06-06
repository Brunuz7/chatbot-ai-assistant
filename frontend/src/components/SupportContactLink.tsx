import { COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL } from '../constants/contact';

type SupportContactLinkProps = {
  className?: string;
};

export function SupportContactLink({ className }: SupportContactLinkProps) {
  return (
    <a
      href={COMPANY_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? 'font-semibold text-primary hover:underline'}>
      entre em contato com nosso suporte ({COMPANY_PHONE_DISPLAY})
    </a>
  );
}
