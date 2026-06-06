import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { MessageDirection } from '../../types/contact';

type ContactMessageDirectionBadgeProps = {
  direction: MessageDirection;
};

export function ContactMessageDirectionBadge({ direction }: ContactMessageDirectionBadgeProps) {
  return direction === 'in' ? (
    <Badge variant="info" className="inline-flex items-center gap-1">
      <ArrowDownLeft size={12} aria-hidden />
      Cliente
    </Badge>
  ) : (
    <Badge variant="success" className="inline-flex items-center gap-1">
      <ArrowUpRight size={12} aria-hidden />
      Assistente
    </Badge>
  );
}
