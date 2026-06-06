import { MessageSquare } from 'lucide-react';
import { CardField } from '../ui/Card';
import { formatDateTimePt } from '../../utils/format';
import { ContactMessageDirectionBadge } from './ContactMessageDirectionBadge';
import type { ContactConversation } from '../../types/contact';

type ContactLastInteractionProps = {
  summary: ContactConversation | null | undefined;
  variant?: 'table' | 'card';
};

export function ContactLastInteraction({ summary, variant = 'card' }: ContactLastInteractionProps) {
  if (!summary?.lastMessage) return <span className="text-foreground-muted">—</span>;

  const { content, timestamp, direction } = summary.lastMessage;
  const tooltip = `${content} · ${formatDateTimePt(timestamp)}`;

  if (variant === 'table') {
    return (
      <p className="line-clamp-2 min-w-0 text-foreground-muted" title={tooltip}>
        {content}
      </p>
    );
  }

  return (
    <CardField
      label="Última interação"
      icon={<MessageSquare size={14} aria-hidden />}
      value={
        <span className="inline-flex flex-col gap-1 align-top">
          <span className="inline-flex flex-wrap items-center gap-2">
            <ContactMessageDirectionBadge direction={direction} />
            <span className="line-clamp-2" title={content}>
              {content}
            </span>
          </span>
          <span className="text-slate-500">{formatDateTimePt(timestamp)}</span>
        </span>
      }
    />
  );
}
