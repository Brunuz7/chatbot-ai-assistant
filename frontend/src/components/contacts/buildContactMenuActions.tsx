import { Edit, Lock, Trash2, Unlock } from 'lucide-react';
import type { CardMenuAction } from '../ui/Card';
import type { Contact } from '../../types/contact';

export function buildContactMenuActions(
  contact: Contact,
  handlers: {
    busy: boolean;
    onEdit: (c: Contact) => void;
    onBlock: (c: Contact) => void;
    onUnblock: (id: string) => void;
    onDelete: (c: Contact) => void;
  },
): CardMenuAction[] {
  const busy = handlers.busy;
  return [
    {
      label: 'Editar',
      icon: <Edit size={16} aria-hidden />,
      onClick: () => handlers.onEdit(contact),
      disabled: busy,
    },
    contact.blocked
      ? {
          label: 'Desbloquear',
          icon: <Unlock size={16} aria-hidden />,
          onClick: () => handlers.onUnblock(contact.id),
          disabled: busy,
        }
      : {
          label: 'Bloquear',
          icon: <Lock size={16} aria-hidden />,
          onClick: () => handlers.onBlock(contact),
          disabled: busy,
        },
    {
      label: 'Excluir',
      icon: <Trash2 size={16} aria-hidden />,
      onClick: () => handlers.onDelete(contact),
      disabled: busy,
      variant: 'danger',
    },
  ];
}
