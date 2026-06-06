type LegalEmailLinkProps = {
  email: string;
  className?: string;
};

export function LegalEmailLink({ email, className }: LegalEmailLinkProps) {
  return (
    <a href={`mailto:${email}`} className={className ?? 'font-semibold text-primary hover:underline break-all'}>
      {email}
    </a>
  );
}
