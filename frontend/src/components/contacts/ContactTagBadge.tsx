import type { TagRef } from '../../types/contact';

type ContactTagBadgeProps = {
  tag: TagRef | null | undefined;
};

export function ContactTagBadge({ tag }: ContactTagBadgeProps) {
  if (!tag) return <span className="text-slate-400">—</span>;

  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold text-white"
      style={{ backgroundColor: tag.color || '#6366f1' }}>
      {tag.name}
    </span>
  );
}
