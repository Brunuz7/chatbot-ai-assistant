type LandingSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
};

export function LandingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: LandingSectionHeaderProps) {
  const alignment = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
