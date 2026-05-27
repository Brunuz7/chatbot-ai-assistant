import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import {
  Users,
  Unlock,
  Lock,
  Phone,
  Plus,
  Edit,
  Trash2,
  Check,
  MessageSquare,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu, type CardMenuAction } from '../components/ui/Card';
import { formatPhoneMask } from '../utils/phoneMask';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal, ModalBody, ModalFloatingButton, ModalSection } from '../components/ui/Modal';
import { Input, PhoneInput, TextArea, Select } from '../components/ui/Input';
import api from '../services/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

interface LeadTagRef {
  id: string;
  name: string;
  color: string | null;
}

interface ContactConversation {
  id: string;
  messageCount: number;
  lastMessage: ConversationMessage | null;
  updatedAt: string;
  agentName: string | null;
  activeFlowName: string | null;
}

interface Contact {
  id: string;
  phone_number: string;
  whatsapp_id?: string;
  blocked: boolean;
  created_at: string;
  block_reason?: string;
  blocked_at?: string;
  blocked_until?: string;
  name?: string;
  observation?: string;
  tag_id?: string | null;
  tag?: LeadTagRef | null;
  conversation?: ContactConversation | null;
}

interface ContactsListResponse {
  items: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    active: number;
    blocked: number;
  };
}

interface LeadTagOption {
  id: string;
  name: string;
  color: string | null;
}

type MessageDirection = 'in' | 'out';

interface ConversationMessage {
  direction: MessageDirection;
  content: string;
  timestamp: string;
}

interface ConversationDetail {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  messageCount: number;
  lastMessage: ConversationMessage | null;
  agentName: string | null;
  activeFlowName: string | null;
  messages: ConversationMessage[];
  context: unknown;
}

const emptyForm = { name: '', phone_number: '', observation: '', tag_id: '' };

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function ContactTagBadge({ tag }: { tag: LeadTagRef | null | undefined }) {
  if (!tag) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold text-white"
      style={{ backgroundColor: tag.color || '#6366f1' }}
    >
      {tag.name}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: MessageDirection }) {
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

function LastInteractionCell({
  summary,
  variant = 'card',
}: {
  summary: ContactConversation | null | undefined;
  variant?: 'table' | 'card';
}) {
  if (!summary?.lastMessage) {
    return <span className="text-slate-400">—</span>;
  }

  const { content, timestamp, direction } = summary.lastMessage;
  const tooltip = `${content} · ${formatWhen(timestamp)}`;

  if (variant === 'table') {
    return (
      <p
        className="line-clamp-2 min-w-0 text-slate-600 dark:text-slate-400"
        title={tooltip}
      >
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
            <DirectionBadge direction={direction} />
            <span className="line-clamp-2" title={content}>
              {content}
            </span>
          </span>
          <span className="text-slate-500">{formatWhen(timestamp)}</span>
        </span>
      }
    />
  );
}

function contactMenuActions(
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

function displayConversationTitle(detail: ConversationDetail) {
  if (detail.contactName) return detail.contactName;
  return detail.phoneNumber;
}

const Contacts: React.FC = () => {
  const [items, setItems] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [counts, setCounts] = useState({ active: 0, blocked: 0 });
  const [leadTags, setLeadTags] = useState<LeadTagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'blocked'>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockingContact, setBlockingContact] = useState<Contact | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockUntil, setBlockUntil] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);

  const fetchLeadTags = async () => {
    try {
      const res = await api.get<LeadTagOption[]>('/api/lead-tags');
      setLeadTags(res.data ?? []);
    } catch {
      setLeadTags([]);
    }
  };

  const fetchList = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const endpoint = activeTab === 'active' ? '/api/contacts' : '/api/contacts/blocked';
        const res = await api.get<ContactsListResponse>(endpoint, {
          params: {
            page,
            limit,
            search: debouncedSearch || undefined,
            tag_id: tagFilter || undefined,
          },
        });
        setItems(res.data?.items ?? []);
        setPagination(
          res.data?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 },
        );
        if (res.data?.counts) setCounts(res.data.counts);
      } catch (error) {
        console.error(error);
        setItems([]);
        setPagination({ page: 1, limit, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, page, limit, debouncedSearch, tagFilter],
  );

  const reload = useCallback(
    async (silent = false) => {
      await Promise.all([fetchList(silent), fetchLeadTags()]);
    },
    [fetchList],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    void fetchLeadTags();
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setContactModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name || '',
      phone_number: contact.phone_number,
      observation: contact.observation || '',
      tag_id: contact.tag_id || contact.tag?.id || '',
    });
    setContactModalOpen(true);
  };

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = form.phone_number.trim();
    if (!phone) {
      toast.error('Informe o número do telefone.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim() || null,
        phone_number: phone,
        observation: form.observation.trim() || null,
      };
      if (editingContact) {
        payload.tag_id = form.tag_id || null;
        await api.put(`/api/contacts/${editingContact.id}`, payload);
        toast.success('Contato atualizado.');
      } else {
        await api.post('/api/contacts', payload);
        toast.success('Contato adicionado.');
      }

      setContactModalOpen(false);
      await reload(true);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o contato.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (contact: Contact) => {
    if (!window.confirm(`Excluir o contato ${contact.name || contact.phone_number}?`)) return;
    try {
      setActionLoading(contact.id);
      await api.delete(`/api/contacts/${contact.id}`);
      toast.success('Contato excluído.');
      await reload(true);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o contato.'));
    } finally {
      setActionLoading(null);
    }
  };

  const openBlockModal = (contact: Contact) => {
    setBlockingContact(contact);
    setBlockReason(contact.block_reason || '');
    setBlockUntil(contact.blocked_until ? contact.blocked_until.slice(0, 16) : '');
    setBlockModalOpen(true);
  };

  const saveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingContact) return;

    try {
      setActionLoading(blockingContact.id);
      await api.patch(`/api/contacts/${blockingContact.id}/block`, {
        reason: blockReason || 'Bloqueado manualmente',
        blockedUntil: blockUntil || null,
      });
      toast.success('Contato bloqueado.');
      setBlockModalOpen(false);
      setBlockingContact(null);
      await reload(true);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível bloquear o contato.'));
    } finally {
      setActionLoading(null);
    }
  };

  const unblockContact = async (id: string) => {
    try {
      setActionLoading(id);
      await api.patch(`/api/contacts/${id}/unblock`, {});
      toast.success('Contato desbloqueado.');
      await reload(true);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível desbloquear o contato.'));
    } finally {
      setActionLoading(null);
    }
  };

  const openConversationDetail = async (conversationId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<ConversationDetail>(`/api/conversations/${conversationId}`);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
      setDetailOpen(false);
      toast.error('Não foi possível carregar a conversa.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = (contact: Contact) => {
    if (contact.conversation?.id) void openConversationDetail(contact.conversation.id);
  };

  const getSummary = useCallback((contact: Contact) => contact.conversation ?? null, []);

  const columns = useMemo(() => {
    const handlers = {
      onEdit: openEdit,
      onBlock: openBlockModal,
      onUnblock: unblockContact,
      onDelete: deleteContact,
    };
    const base = [
      {
        header: 'Contato',
        accessor: (contact: Contact) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {contact.name || 'Sem nome'}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Phone size={12} aria-hidden />
              {contact.phone_number}
            </p>
          </div>
        ),
      },
      {
        header: 'Última interação',
        accessor: (contact: Contact) => (
          <LastInteractionCell summary={getSummary(contact)} variant="table" />
        ),
        className: 'min-w-[16rem] max-w-[28rem] w-[28rem]',
      },
      {
        header: 'Classificação',
        accessor: (contact: Contact) => <ContactTagBadge tag={contact.tag} />,
        className: 'w-[9rem] max-w-[9rem]',
      },
    ];

    if (activeTab === 'active') {
      return [
        ...base,
        {
          header: 'Status',
          accessor: (contact: Contact) => {
            const now = new Date();
            const isBlocked =
              contact.blocked &&
              (!contact.blocked_until || new Date(contact.blocked_until) > now);
            return (
              <span className={isBlocked ? 'text-red-400' : 'text-green-400'}>
                {isBlocked ? 'Bloqueado' : 'Ativo'}
              </span>
            );
          },
        },
        {
          header: 'Ações',
          accessor: (contact: Contact) => (
            <CardActionsMenu
              actions={contactMenuActions(contact, { ...handlers, busy: actionLoading === contact.id })}
            />
          ),
          className: 'text-right w-14',
        },
      ];
    }

    return [
      ...base,
      { header: 'Motivo', accessor: (contact: Contact) => contact.block_reason || '—' },
      {
        header: 'Bloqueado até',
        accessor: (contact: Contact) => {
          if (!contact.blocked_until) return '—';
          const date = new Date(contact.blocked_until);
          return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        },
      },
      {
        header: 'Ações',
        accessor: (contact: Contact) => (
          <CardActionsMenu
            actions={contactMenuActions(contact, { ...handlers, busy: actionLoading === contact.id })}
          />
        ),
        className: 'text-right w-14',
      },
    ];
  }, [activeTab, getSummary, actionLoading]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Users}
          title="Contatos"
          subtitle="Gerir contatos, ver a última mensagem e abrir o histórico da conversa. Registos com mais de 30 dias sem actividade são removidos automaticamente."
          actions={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                className="h-11 w-full gap-2 sm:h-auto sm:w-auto"
                disabled={loading || refreshing}
                onClick={() => void reload(true)}
              >
                {refreshing ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : (
                  <RefreshCw size={18} aria-hidden />
                )}
                Actualizar
              </Button>
              <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
                <Plus size={20} aria-hidden />
                Adicionar contato
              </Button>
            </div>
          }
        />

        <div className="flex gap-3">
          <Button
            variant={activeTab === 'active' ? 'primary' : 'outline'}
            onClick={() => {
              setActiveTab('active');
              setPage(1);
            }}
          >
            Ativos ({counts.active})
          </Button>
          <Button
            variant={activeTab === 'blocked' ? 'primary' : 'outline'}
            onClick={() => {
              setActiveTab('blocked');
              setPage(1);
            }}
          >
            Bloqueados ({counts.blocked})
          </Button>
        </div>

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar nome, número ou última mensagem…"
          activeFiltersCount={tagFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setTagFilter('');
            setPage(1);
          }}
        >
          <div className="w-full">
            <Select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as classificações</option>
              <option value="__none__">Sem classificação</option>
              {leadTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </FilterBar>

        <DataList
          data={items}
          columns={columns}
          isLoading={loading}
          onRowClick={handleRowClick}
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages,
            onPageChange: setPage,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
            disabled: loading || refreshing,
            itemLabel: 'contato',
            limitOptions: [20, 50],
          }}
          renderCard={(contact: Contact) => {
            const summary = getSummary(contact);
            const now = new Date();
            const isBlocked =
              contact.blocked &&
              (!contact.blocked_until || new Date(contact.blocked_until) > now);
            return (
              <DataCard
                title={contact.name || 'Sem nome'}
                actions={contactMenuActions(contact, {
                  busy: actionLoading === contact.id,
                  onEdit: openEdit,
                  onBlock: openBlockModal,
                  onUnblock: unblockContact,
                  onDelete: deleteContact,
                })}
                onClick={
                  summary ? () => void openConversationDetail(summary.id) : undefined
                }
                menuAriaLabel={`Acções do contato ${contact.name || contact.phone_number}`}
              >
                <CardField
                  label="Telefone"
                  icon={<Phone size={14} aria-hidden />}
                  value={formatPhoneMask(contact.phone_number) || contact.phone_number}
                />
                <CardField
                  label="Classificação"
                  icon={<Tag size={14} aria-hidden />}
                  value={<ContactTagBadge tag={contact.tag} />}
                />
                {activeTab === 'active' ? (
                  <CardField
                    label="Estado"
                    value={
                      <span
                        className={
                          isBlocked ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {isBlocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    }
                  />
                ) : (
                  <>
                    {contact.block_reason ? (
                      <CardField label="Motivo" value={contact.block_reason} />
                    ) : null}
                    <CardField
                      label="Bloqueado até"
                      value={
                        contact.blocked_until
                          ? formatWhen(contact.blocked_until)
                          : '—'
                      }
                    />
                  </>
                )}
                <LastInteractionCell summary={summary} variant="card" />
              </DataCard>
            );
          }}
        />
      </div>

      <Modal
        isOpen={detailOpen}
        onClose={() => !detailLoading && setDetailOpen(false)}
        icon={MessageSquare}
        pageWidth="lg"
        title={detail ? displayConversationTitle(detail) : 'Conversa'}
        subtitle={
          detail
            ? `${detail.phoneNumber} · ${detail.messageCount} mensagem${detail.messageCount !== 1 ? 's' : ''}`
            : 'A carregar histórico…'
        }
      >
        <ModalBody>
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : detail ? (
            <ModalSection>
              <ul className="space-y-3 max-h-[min(60vh,520px)] overflow-y-auto pr-1 custom-scrollbar">
                {detail.messages.length === 0 ? (
                  <li className="text-sm text-slate-500 italic">Sem mensagens nesta conversa.</li>
                ) : (
                  detail.messages.map((msg, i) => (
                    <li
                      key={`${msg.timestamp}-${i}`}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        msg.direction === 'in'
                          ? 'border-blue-200/60 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/10'
                          : 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <DirectionBadge direction={msg.direction} />
                        <span className="text-xs text-slate-500">{formatWhen(msg.timestamp)}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              {(detail.agentName || detail.activeFlowName) && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
                  {detail.agentName ? <p>Agente: {detail.agentName}</p> : null}
                  {detail.activeFlowName ? <p>Fluxo activo: {detail.activeFlowName}</p> : null}
                </div>
              )}
            </ModalSection>
          ) : null}
        </ModalBody>
      </Modal>

      <Modal
        variant="form"
        pageWidth="lg"
        isOpen={contactModalOpen}
        onClose={() => !saving && setContactModalOpen(false)}
        icon={Users}
        title={editingContact ? 'Editar contato' : 'Novo contato'}
        subtitle={
          editingContact
            ? 'Actualize nome, telefone ou observações internas.'
            : 'Adicione um contacto manualmente à sua lista.'
        }
        floatingAction={
          <ModalFloatingButton type="submit" form="contact-form" disabled={saving}>
            <Check size={18} strokeWidth={2.25} aria-hidden />
            {saving ? 'Salvando…' : editingContact ? 'Salvar' : 'Adicionar'}
          </ModalFloatingButton>
        }
      >
        <ModalBody>
          <form id="contact-form" onSubmit={saveContact}>
            <ModalSection>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do contato (opcional)"
                />
                <PhoneInput
                  label="Telefone"
                  value={form.phone_number}
                  onChange={(phone_number) => setForm({ ...form, phone_number })}
                  required
                />
              </div>
              <TextArea
                label="Observação"
                value={form.observation}
                onChange={(e) => setForm({ ...form, observation: e.target.value })}
                placeholder="Notas internas (opcional)"
                rows={4}
              />
              {editingContact ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Classificação
                  </label>
                  <Select
                    value={form.tag_id}
                    onChange={(e) => setForm({ ...form, tag_id: e.target.value })}
                  >
                    <option value="">Sem classificação</option>
                    {leadTags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </ModalSection>
          </form>
        </ModalBody>
      </Modal>

      <Modal
        variant="form"
        pageWidth="md"
        icon={Lock}
        isOpen={blockModalOpen}
        onClose={() => !actionLoading && setBlockModalOpen(false)}
        title="Bloquear contato"
        subtitle={blockingContact?.name || blockingContact?.phone_number}
        floatingAction={
          <ModalFloatingButton
            type="submit"
            form="block-contact-form"
            disabled={actionLoading === blockingContact?.id}
          >
            {actionLoading === blockingContact?.id ? 'A bloquear…' : 'Bloquear'}
          </ModalFloatingButton>
        }
      >
        <ModalBody>
          <form id="block-contact-form" onSubmit={saveBlock}>
            <ModalSection>
              <Input
                label="Motivo"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Motivo do bloqueio"
              />
              <Input
                label="Bloqueado até (opcional)"
                type="datetime-local"
                value={blockUntil}
                onChange={(e) => setBlockUntil(e.target.value)}
              />
            </ModalSection>
          </form>
        </ModalBody>
      </Modal>
    </Layout>
  );
};

export default Contacts;
