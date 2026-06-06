type LegalSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}
