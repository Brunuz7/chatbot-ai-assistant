import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Users, Unlock, Lock, MoreVertical, Phone, Plus, Edit, Trash2, Check } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { Button } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal, ModalBody, ModalFloatingButton, ModalFooterBar, ModalSection } from '../components/ui/Modal';
import { Input, TextArea, Select } from '../components/ui/Input';
import api from '../services/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

interface LeadTagRef {
  id: string;
  name: string;
  color: string | null;
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
}

interface LeadTagOption {
  id: string;
  name: string;
  color: string | null;
}

const emptyForm = { name: '', phone_number: '', observation: '', tag_id: '' };

function ContactTagBadge({ tag }: { tag: LeadTagRef | null | undefined }) {
  if (!tag) {
    return <span className="text-slate-400">Sem tag</span>;
  }
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: tag.color || '#6366f1' }}
    >
      {tag.name}
    </span>
  );
}

type RowActionsProps = {
  contact: Contact;
  busy: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
};

function ContactRowActions({
  contact,
  busy,
  menuOpen,
  onToggleMenu,
  onEdit,
  onBlock,
  onUnblock,
  onDelete,
}: RowActionsProps) {
  return (
    <div className="relative flex gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={onToggleMenu}
        className="p-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 disabled:opacity-50"
      >
        <MoreVertical size={18} />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-10 w-48 z-50 bg-slate-900/95 backdrop-blur-xl border border-cyan-400/20 rounded-xl shadow-xl overflow-hidden">
          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            className="w-full px-4 py-3 text-left hover:bg-white/10 flex items-center gap-2 text-sm"
          >
            <Edit size={16} />
            Editar
          </button>
          {!contact.blocked ? (
            <button
              type="button"
              disabled={busy}
              onClick={onBlock}
              className="w-full px-4 py-3 text-left hover:bg-red-500/20 flex items-center gap-2 text-sm text-red-300"
            >
              <Lock size={16} />
              Bloquear
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onUnblock}
              className="w-full px-4 py-3 text-left hover:bg-green-500/20 flex items-center gap-2 text-sm text-green-300"
            >
              <Unlock size={16} />
              Desbloquear
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="w-full px-4 py-3 text-left hover:bg-red-500/30 flex items-center gap-2 text-sm text-red-400 border-t border-white/10"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [leadTags, setLeadTags] = useState<LeadTagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'blocked'>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockingContact, setBlockingContact] = useState<Contact | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockUntil, setBlockUntil] = useState('');

  const fetchLeadTags = async () => {
    try {
      const res = await api.get<LeadTagOption[]>('/api/lead-tags');
      setLeadTags(res.data ?? []);
    } catch {
      setLeadTags([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get<Contact[]>('/api/contacts');
      const filtered = response.data.filter((c) => {
        const id = c.whatsapp_id || c.id || '';
        return !id.endsWith('@g.us') && !id.includes('broadcast');
      });
      setContacts(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBlockedContacts = async () => {
    try {
      const response = await api.get<Contact[]>('/api/contacts/blocked');
      setBlockedContacts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const reload = async () => {
    await Promise.all([fetchContacts(), fetchBlockedContacts()]);
  };

  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setContactModalOpen(true);
    setOpenMenu(null);
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
    setOpenMenu(null);
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
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o contato.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (contact: Contact) => {
    if (!window.confirm(`Excluir o contato ${contact.name || contact.phone_number}?`)) return;
    setOpenMenu(null);
    try {
      setActionLoading(contact.id);
      await api.delete(`/api/contacts/${contact.id}`);
      toast.success('Contato excluído.');
      await reload();
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
    setOpenMenu(null);
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
      await reload();
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
      setOpenMenu(null);
      await api.patch(`/api/contacts/${id}/unblock`, {});
      toast.success('Contato desbloqueado.');
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível desbloquear o contato.'));
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    (async () => {
      try {
        setLoading(true);
        await reload();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  const currentList = activeTab === 'active' ? contacts : blockedContacts;

  const filteredContacts = currentList.filter((contact) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      contact.phone_number.toLowerCase().includes(q) ||
      (contact.name || '').toLowerCase().includes(q) ||
      (contact.observation || '').toLowerCase().includes(q) ||
      (contact.tag?.name || '').toLowerCase().includes(q);
    const tagId = contact.tag_id || contact.tag?.id || '';
    const matchesTag =
      tagFilter === '' ||
      (tagFilter === '__none__' ? !tagId : tagId === tagFilter);
    return matchesSearch && matchesTag;
  });

  const rowActions = (contact: Contact) => (
    <ContactRowActions
      contact={contact}
      busy={actionLoading === contact.id}
      menuOpen={openMenu === contact.id}
      onToggleMenu={() => setOpenMenu(openMenu === contact.id ? null : contact.id)}
      onEdit={() => openEdit(contact)}
      onBlock={() => openBlockModal(contact)}
      onUnblock={() => unblockContact(contact.id)}
      onDelete={() => deleteContact(contact)}
    />
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Users}
          title="Contatos"
          subtitle="Gerir contatos do WhatsApp: adicionar, editar, bloquear ou excluir."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden />
              Adicionar contato
            </Button>
          }
        />

        <div className="flex gap-3">
          <Button
            variant={activeTab === 'active' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('active')}
          >
            Ativos ({contacts.length})
          </Button>
          <Button
            variant={activeTab === 'blocked' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('blocked')}
          >
            Bloqueados ({blockedContacts.length})
          </Button>
        </div>

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar nome ou número..."
          activeFiltersCount={tagFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setTagFilter('');
          }}
        >
          <div className="w-full">
            <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">Todas as tags</option>
              <option value="__none__">Sem tag</option>
              {leadTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </FilterBar>

        {loading ? (
          <div className="text-center py-10 text-white">Carregando...</div>
        ) : (
          <DataList
            data={filteredContacts}
            columns={[
              { header: 'Nome', accessor: (contact: Contact) => contact.name || 'Sem nome' },
              {
                header: 'Número',
                accessor: (contact: Contact) => (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {contact.phone_number}
                  </div>
                ),
              },
              {
                header: 'Observação',
                accessor: (contact: Contact) => contact.observation || '—',
              },
              {
                header: 'Tag',
                accessor: (contact: Contact) => <ContactTagBadge tag={contact.tag} />,
              },
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
              { header: 'Motivo', accessor: (contact: Contact) => contact.block_reason || '—' },
              {
                header: 'Bloqueado até',
                accessor: (contact: Contact) => {
                  if (!contact.blocked_until) return '—';
                  const date = new Date(contact.blocked_until);
                  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                },
              },
              { header: 'Ações', accessor: (contact: Contact) => rowActions(contact) },
            ]}
            renderCard={(contact: Contact) => (
              <div key={contact.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-white font-bold text-lg">{contact.name || 'Sem nome'}</h3>
                  <p className="text-gray-400 flex items-center gap-2">
                    <Phone size={14} />
                    {contact.phone_number}
                  </p>
                  {contact.observation ? (
                    <p className="text-sm text-gray-500 mt-1">{contact.observation}</p>
                  ) : null}
                  <div className="mt-2">
                    <ContactTagBadge tag={contact.tag} />
                  </div>
                </div>
                <div>
                  <span className={contact.blocked ? 'text-red-400' : 'text-green-400'}>
                    {contact.blocked ? 'Bloqueado' : 'Ativo'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openEdit(contact)}>
                    <Edit size={14} />
                    Editar
                  </Button>
                  {!contact.blocked ? (
                    <Button variant="primary" onClick={() => openBlockModal(contact)}>
                      <Lock size={14} />
                      Bloquear
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => unblockContact(contact.id)}>
                      <Unlock size={14} />
                      Desbloquear
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => deleteContact(contact)}>
                    <Trash2 size={14} />
                    Excluir
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </div>

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
          <ModalSection title="Dados do contacto">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do contato (opcional)"
            />
            <div>
              <Input
                label="Telefone"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="5511999999999"
                required
              />
              <p className="text-xs text-slate-500 mt-1.5">Apenas números, com DDI (ex.: 55 para Brasil).</p>
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
                  Tag de lead
                </label>
                <Select
                  value={form.tag_id}
                  onChange={(e) => setForm({ ...form, tag_id: e.target.value })}
                >
                  <option value="">Sem tag</option>
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
        variant="dialog"
        maxWidth="md"
        icon={Lock}
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Bloquear contato"
        subtitle={blockingContact?.name || blockingContact?.phone_number}
        footer={
          <ModalFooterBar size="md">
            <Button type="button" variant="outline" onClick={() => setBlockModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="block-contact-form"
              variant="primary"
              disabled={actionLoading === blockingContact?.id}
            >
              {actionLoading === blockingContact?.id ? 'A bloquear...' : 'Bloquear'}
            </Button>
          </ModalFooterBar>
        }
      >
        <ModalBody>
          <form id="block-contact-form" onSubmit={saveBlock} className="space-y-4">
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
          </form>
        </ModalBody>
      </Modal>

    </Layout>
  );
};

export default Contacts;
