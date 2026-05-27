import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Tags, Plus, Edit, Trash2, Loader2, Check, ListOrdered, FileText } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Select, TextArea, Input as TextInput } from '../components/ui/Input';
import { Modal, ModalBody, ModalFloatingButton, ModalFooterBar, ModalSection } from '../components/ui/Modal';
import api from '../services/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

interface LeadTagItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TAG_COLORS = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#64748b', label: 'Cinza' },
] as const;

const DEFAULT_TAG_COLOR = TAG_COLORS[0].value;

function normalizeTagColor(color: string | null | undefined): string {
  const c = color?.trim() || DEFAULT_TAG_COLOR;
  return TAG_COLORS.some((opt) => opt.value === c) ? c : DEFAULT_TAG_COLOR;
}

const emptyForm = {
  name: '',
  description: '',
  color: DEFAULT_TAG_COLOR,
  is_active: true,
};

type UserSettingsSnippet = { tagging_enabled: boolean };

const LeadTags: React.FC = () => {
  const [items, setItems] = useState<LeadTagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingQualification, setSavingQualification] = useState(false);
  const [qualificationEnabled, setQualificationEnabled] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTagItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fetchGenRef = useRef(0);

  const fetchItems = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    try {
      const res = await api.get<LeadTagItem[]>('/api/lead-tags');
      if (gen !== fetchGenRef.current) return;
      setItems(res.data ?? []);
    } catch (e) {
      if (gen !== fetchGenRef.current) return;
      console.error(e);
      setItems([]);
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 429
          ? 'Muitos pedidos à API. Aguarde um momento e recarregue a página.'
          : 'Não foi possível carregar as classificações.',
      );
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get<UserSettingsSnippet>('/api/settings');
      setQualificationEnabled(res.data.tagging_enabled === true);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar as preferências de qualificação.');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveQualification = async (enabled: boolean) => {
    setSavingQualification(true);
    try {
      const res = await api.patch<UserSettingsSnippet>('/api/settings/lead-qualification', {
        tagging_enabled: enabled,
      });
      setQualificationEnabled(res.data.tagging_enabled === true);
      toast.success(
        enabled
          ? 'Qualificação automática activada.'
          : 'Qualificação automática desactivada.',
      );
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível guardar.'));
    } finally {
      setSavingQualification(false);
    }
  };

  useEffect(() => {
    void fetchItems();
    void fetchSettings();
    return () => {
      fetchGenRef.current += 1;
    };
  }, [fetchItems, fetchSettings]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: LeadTagItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      color: normalizeTagColor(item.color),
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaveLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        is_active: form.is_active,
      };
      if (editing) {
        await api.put(`/api/lead-tags/${editing.id}`, payload);
        toast.success('Classificação actualizada.');
      } else {
        await api.post('/api/lead-tags', payload);
        toast.success('Classificação criada.');
      }
      setModalOpen(false);
      await fetchItems();
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar a classificação.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/lead-tags/${id}`);
      setDeleteId(null);
      toast.success('Classificação removida.');
      await fetchItems();
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível remover a classificação.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const tagBadge = (item: LeadTagItem) => (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold text-white"
      style={{ backgroundColor: item.color || '#6366f1' }}
    >
      {item.name}
    </span>
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Tags}
          title="Classificação de contatos"
          subtitle="Rótulos por intenção e estágio do contacto."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden /> Nova classificação
            </Button>
          }
        />

        <div className="flex items-center justify-end">
          {settingsLoading ? (
            <Loader2 className="animate-spin text-slate-400" size={18} aria-hidden />
          ) : (
            <label
              htmlFor="auto-qualification-switch"
              className="flex cursor-pointer items-center gap-3"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Qualificação automática
              </span>
              <Switch
                id="auto-qualification-switch"
                checked={qualificationEnabled}
                disabled={savingQualification}
                onCheckedChange={(enabled) => void saveQualification(enabled)}
                aria-label="Qualificação automática"
              />
            </label>
          )}
        </div>

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar classificações..."
          activeFiltersCount={statusFilter !== 'all' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }}
        >
          <div className="w-full">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </Select>
          </div>
        </FilterBar>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            A carregar…
          </div>
        ) : (
          <DataList
            data={filteredItems}
            itemLabel="classificação"
            columns={[
              { header: 'Classificação', accessor: (item) => tagBadge(item) },
              {
                header: 'Descrição',
                accessor: (item) => (
                  <span className="text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.description || '—'}
                  </span>
                ),
              },
              { header: 'Ordem', accessor: (item) => <span className="text-slate-500">{item.sort_order}</span> },
              {
                header: 'Estado',
                accessor: (item) => (
                  <Badge variant={item.is_active ? 'success' : 'warning'}>
                    {item.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                ),
              },
              {
                header: 'Acções',
                accessor: (item) => (
                  <CardActionsMenu
                    actions={[
                      {
                        label: 'Editar',
                        icon: <Edit size={16} aria-hidden />,
                        onClick: () => openEdit(item),
                      },
                      {
                        label: 'Excluir',
                        icon: <Trash2 size={16} aria-hidden />,
                        onClick: () => setDeleteId(item.id),
                        variant: 'danger',
                      },
                    ]}
                  />
                ),
                className: 'text-right w-14',
              },
            ]}
            renderCard={(item) => (
              <DataCard
                title={item.name}
                actions={[
                  {
                    label: 'Editar',
                    icon: <Edit size={16} aria-hidden />,
                    onClick: () => openEdit(item),
                  },
                  {
                    label: 'Excluir',
                    icon: <Trash2 size={16} aria-hidden />,
                    onClick: () => setDeleteId(item.id),
                    variant: 'danger',
                  },
                ]}
                menuAriaLabel={`Acções da classificação ${item.name}`}
              >
                <CardField
                  label="Cor"
                  icon={<Tags size={14} aria-hidden />}
                  value={tagBadge(item)}
                />
                <CardField
                  label="Estado"
                  value={
                    <Badge variant={item.is_active ? 'success' : 'warning'}>
                      {item.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  }
                />
                <CardField
                  label="Descrição"
                  icon={<FileText size={14} aria-hidden />}
                  value={
                    item.description || 'Sem descrição — a IA usará o nome da classificação para classificar.'
                  }
                  className="[&_span:last-child]:line-clamp-4"
                />
                <CardField
                  label="Ordem"
                  icon={<ListOrdered size={14} aria-hidden />}
                  value={item.sort_order}
                />
              </DataCard>
            )}
          />
        )}

        {!loading && filteredItems.length === 0 && (
          <p className="py-8 text-center text-slate-500">
            {items.length === 0
              ? 'Nenhuma classificação cadastrada.'
              : 'Nenhuma classificação corresponde ao filtro actual.'}
          </p>
        )}

        <Modal
          variant="form"
          pageWidth="lg"
          isOpen={modalOpen}
          onClose={() => !saveLoading && setModalOpen(false)}
          icon={Tags}
          title={editing ? 'Editar classificação' : 'Nova classificação'}
          subtitle="A descrição ajuda a IA a escolher a classificação correcta durante o atendimento."
          floatingAction={
            <ModalFloatingButton
              type="submit"
              form="lead-tag-form"
              disabled={saveLoading || !form.name.trim()}
            >
              {saveLoading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Check size={18} strokeWidth={2.25} aria-hidden />
              )}
              {saveLoading ? 'Salvando…' : 'Salvar'}
            </ModalFloatingButton>
          }
        >
          <ModalBody>
            <form
              id="lead-tag-form"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
            <ModalSection>
              <TextInput
                label="Nome"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Lead quente"
              />
              <TextArea
                label="Descrição (para a IA)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex.: Cliente demonstrou interesse claro em comprar ou agendar."
                rows={3}
              />
              <div className="w-full space-y-2">
                <span className="type-label block">Cor</span>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map(({ value, label }) => {
                    const selected = form.color === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`h-9 w-9 rounded-full border-2 border-white shadow transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-800 ${
                          selected
                            ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900'
                            : 'ring-1 ring-slate-200 dark:ring-slate-600'
                        }`}
                        style={{ backgroundColor: value }}
                        onClick={() => setForm((f) => ({ ...f, color: value }))}
                        aria-label={label}
                        aria-pressed={selected}
                      />
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Classificação activa (disponível para qualificação automática)
              </label>
            </ModalSection>
            </form>
          </ModalBody>
        </Modal>

        <Modal
          variant="dialog"
          maxWidth="sm"
          isOpen={deleteId !== null}
          onClose={() => !deleteLoading && setDeleteId(null)}
          title="Remover classificação"
          subtitle="Contatos com esta classificação ficarão sem classificação."
          footer={
            <ModalFooterBar size="md">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLoading}
                onClick={() => deleteId && void remove(deleteId)}
              >
                {deleteLoading ? 'A remover…' : 'Remover'}
              </Button>
            </ModalFooterBar>
          }
        >
          <ModalBody>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Esta acção não pode ser desfeita. A classificação será removida da lista e dos contactos associados.
            </p>
          </ModalBody>
        </Modal>
      </div>
    </Layout>
  );
};

export default LeadTags;
