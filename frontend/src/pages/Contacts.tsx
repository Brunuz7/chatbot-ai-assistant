import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Users, Phone, Plus, MessageSquare, Tag, Lock, SearchX } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { DEFAULT_PAGE_LIMIT } from '../components/ui/TablePagination';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { ContactTagBadge } from '../components/contacts/ContactTagBadge';
import { ContactMessageDirectionBadge } from '../components/contacts/ContactMessageDirectionBadge';
import { ContactLastInteraction } from '../components/contacts/ContactLastInteraction';
import { buildContactMenuActions } from '../components/contacts/buildContactMenuActions';
import { formatPhoneMask, normalizePhoneDigits, phoneInputDigitsFromStored, DEFAULT_PHONE_INPUT_VALUE } from '../utils/phoneMask';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal, ModalBody, ModalForm, ModalSection } from '../components/ui/Modal';
import { ModalMessagesSkeleton } from '../components/ui/Skeleton';
import { Input, PhoneInput, TextArea, Select } from '../components/ui/Input';
import { contactService } from '../services/ContactService';
import { tagService } from '../services/TagService';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTimePt } from '../utils/format';
import { displayConversationTitle } from '../utils/conversation';
import type { Contact, ContactPayload, ConversationDetail } from '../types/contact';
import type { TagOption } from '../types/tag';

const emptyForm = { name: '', phone_number: DEFAULT_PHONE_INPUT_VALUE, observation: '', tag_id: '' };

const Contacts: React.FC = () => {
  const [items, setItems] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = DEFAULT_PAGE_LIMIT;
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [counts, setCounts] = useState({ active: 0, blocked: 0 });
  const [tags, setTags] = useState<TagOption[]>([]);
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

  const fetchTags = async () => {
    try {
      const tagList = await tagService.list();
      setTags(tagList);
    } catch {
      setTags([]);
    }
  };

  const fetchList = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = {
          page,
          limit,
          search: debouncedSearch || undefined,
        };
        const res =
          activeTab === 'active'
            ? await contactService.listActive(params)
            : await contactService.listBlocked(params);
        setItems(res?.items ?? []);
        setPagination(res?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
        if (res?.counts) setCounts(res.counts);
      } catch (error) {
        console.error(error);
        setItems([]);
        setPagination({ page: 1, limit, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, page, limit, debouncedSearch],
  );

  const reload = useCallback(
    async (silent = false) => {
      await Promise.all([fetchList(silent), fetchTags()]);
    },
    [fetchList, fetchTags],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    void fetchTags();
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
      phone_number: phoneInputDigitsFromStored(contact.phone_number),
      observation: contact.observation || '',
      tag_id: contact.tag_id || contact.tag?.id || '',
    });
    setContactModalOpen(true);
  };

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhoneDigits(form.phone_number);
    if (!phone) {
      toast.error('Informe o número do telefone.');
      return;
    }

    setSaving(true);
    try {
      if (editingContact) {
        const payload: ContactPayload = {
          name: form.name.trim() || null,
          phone_number: phone,
          observation: form.observation.trim() || null,
          tag_id: form.tag_id || null,
        };
        await contactService.update(editingContact.id, payload);
        toast.success('Contato atualizado.');
      } else {
        await contactService.create({
          name: form.name.trim() || null,
          phone_number: phone,
          observation: form.observation.trim() || null,
        });
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
      await contactService.delete(contact.id);
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
      await contactService.block(blockingContact.id, {
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
      await contactService.unblock(id);
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
      const conversation = await contactService.getConversation(conversationId);
      setDetail(conversation);
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
            <p className="font-medium text-foreground">{contact.name || 'Sem nome'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-foreground-muted">
              <Phone size={12} aria-hidden />
              {contact.phone_number}
            </p>
          </div>
        ),
      },
      {
        header: 'Última interação',
        accessor: (contact: Contact) => (
          <ContactLastInteraction summary={getSummary(contact)} variant="table" />
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
            const isBlocked = contact.blocked && (!contact.blocked_until || new Date(contact.blocked_until) > now);
            return (
              <Badge variant={isBlocked ? 'danger' : 'success'}>{isBlocked ? 'Bloqueado' : 'Ativo'}</Badge>
            );
          },
        },
        {
          header: 'Ações',
          accessor: (contact: Contact) => (
            <CardActionsMenu
              actions={buildContactMenuActions(contact, { ...handlers, busy: actionLoading === contact.id })}
            />
          ),
          className: 'text-right w-14',
        },
      ];
    }

    return [
      ...base,
      { header: 'Motivo', accessor: (contact: Contact) => contact.block_reason || <span className="text-foreground-muted">—</span> },
      {
        header: 'Bloqueado até',
        accessor: (contact: Contact) => {
          if (!contact.blocked_until) return <span className="text-foreground-muted">—</span>;
          const date = new Date(contact.blocked_until);
          return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        },
      },
      {
        header: 'Ações',
        accessor: (contact: Contact) => (
          <CardActionsMenu
            actions={buildContactMenuActions(contact, { ...handlers, busy: actionLoading === contact.id })}
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
          subtitle="Contatos, histórico e última mensagem."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden />
              Adicionar contato
            </Button>
          }
        />

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar nome, número ou última mensagem…">
          <FilterBar.Chips
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value as 'active' | 'blocked');
              setPage(1);
            }}
            options={[
              { value: 'active', label: `Ativos (${counts.active})` },
              { value: 'blocked', label: `Bloqueados (${counts.blocked})` },
            ]}
            aria-label="Estado do contato"
          />
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
            disabled: loading || refreshing,
          }}
          renderCard={(contact: Contact) => {
            const summary = getSummary(contact);
            const now = new Date();
            const isBlocked = contact.blocked && (!contact.blocked_until || new Date(contact.blocked_until) > now);
            return (
              <DataCard
                title={contact.name || 'Sem nome'}
                actions={buildContactMenuActions(contact, {
                  busy: actionLoading === contact.id,
                  onEdit: openEdit,
                  onBlock: openBlockModal,
                  onUnblock: unblockContact,
                  onDelete: deleteContact,
                })}
                onClick={summary ? () => void openConversationDetail(summary.id) : undefined}
                menuAriaLabel={`Acções do contato ${contact.name || contact.phone_number}`}>
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
                      <Badge variant={isBlocked ? 'danger' : 'success'}>{isBlocked ? 'Bloqueado' : 'Ativo'}</Badge>
                    }
                  />
                ) : (
                  <>
                    {contact.block_reason ? <CardField label="Motivo" value={contact.block_reason} /> : null}
                    <CardField
                      label="Bloqueado até"
                      value={contact.blocked_until ? formatDateTimePt(contact.blocked_until) : '—'}
                    />
                  </>
                )}
                <ContactLastInteraction summary={summary} variant="card" />
              </DataCard>
            );
          }}
          emptyState={
            pagination.total === 0 && !searchTerm.trim() ? (
              <EmptyState
                icon={Users}
                title={activeTab === 'blocked' ? 'Nenhum contato bloqueado' : 'Nenhum contato'}
                description={
                  activeTab === 'blocked'
                    ? 'Quando bloquear um contacto, ele aparecerá aqui.'
                    : 'Adicione contactos para conversar e acompanhar o histórico no WhatsApp.'
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhum resultado"
                description="Nenhum contato corresponde à busca ou aos filtros actuais."
              />
            )
          }
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
        }>
        <ModalBody>
          {detailLoading ? (
            <ModalMessagesSkeleton />
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
                      }`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <ContactMessageDirectionBadge direction={msg.direction} />
                        <span className="text-xs text-slate-500">{formatDateTimePt(msg.timestamp)}</span>
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
                  {detail.activeFlowName ? <p>Fluxo ativo: {detail.activeFlowName}</p> : null}
                </div>
              )}
            </ModalSection>
          ) : null}
        </ModalBody>
      </Modal>

      <ModalForm
        formId="contact-form"
        isOpen={contactModalOpen}
        onClose={() => !saving && setContactModalOpen(false)}
        icon={Users}
        title={editingContact ? 'Editar contato' : 'Novo contato'}
        subtitle={editingContact ? 'Nome, telefone e observações.' : 'Adicionar contacto à lista.'}
        submitDisabled={saving}
        submitLoading={saving}
        submitLabel={saving ? 'Salvando…' : editingContact ? 'Salvar' : 'Adicionar'}>
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
                  placeholder="+55 (00) 00000-0000"
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
                  <Select value={form.tag_id} onChange={(e) => setForm({ ...form, tag_id: e.target.value })}>
                    <option value="">Sem classificação</option>
                    {tags.map((t) => (
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
      </ModalForm>

      <ModalForm
        formId="block-contact-form"
        pageWidth="md"
        icon={Lock}
        isOpen={blockModalOpen}
        onClose={() => !actionLoading && setBlockModalOpen(false)}
        title="Bloquear contato"
        subtitle={blockingContact?.name || blockingContact?.phone_number}
        submitDisabled={actionLoading === blockingContact?.id}
        submitLoading={actionLoading === blockingContact?.id}
        submitLabel={actionLoading === blockingContact?.id ? 'A bloquear…' : 'Bloquear'}>
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
      </ModalForm>
    </Layout>
  );
};

export default Contacts;
