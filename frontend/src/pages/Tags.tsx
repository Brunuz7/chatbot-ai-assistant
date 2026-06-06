import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Tags as TagsIcon, Plus, Edit, Trash2, ListOrdered, FileText, SearchX } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { TextArea, Input as TextInput } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Modal, ModalBody, ModalForm, ModalFooterBar, ModalSection } from '../components/ui/Modal';
import { tagService } from '../services/TagService';
import type { TagItem } from '../types/tag';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { pickAllowedColor } from '../utils/tagColor';
const TAG_COLORS = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#64748b', label: 'Cinza' },
] as const;

type TagColor = (typeof TAG_COLORS)[number]['value'];
const DEFAULT_TAG_COLOR: TagColor = TAG_COLORS[0].value;

type TagForm = { name: string; description: string; color: TagColor };

const emptyForm: TagForm = {
  name: '',
  description: '',
  color: DEFAULT_TAG_COLOR,
};

const TagsPage: React.FC = () => {
  const [items, setItems] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TagItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fetchGenRef = useRef(0);

  const fetchItems = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    try {
      const items = await tagService.listItems();
      if (gen !== fetchGenRef.current) return;
      setItems(items);
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

  useEffect(() => {
    void fetchItems();
    return () => {
      fetchGenRef.current += 1;
    };
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q || item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
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

  const openEdit = (item: TagItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      color: pickAllowedColor(
        item.color,
        TAG_COLORS.map((opt) => opt.value),
        DEFAULT_TAG_COLOR,
      ),
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
        is_active: true,
      };
      if (editing) {
        await tagService.update(editing.id, payload);
        toast.success('Classificação atualizada.');
      } else {
        await tagService.create(payload);
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
      await tagService.delete(id);
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

  const tagBadge = (item: TagItem) => (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold text-white"
      style={{ backgroundColor: item.color || '#6366f1' }}>
      {item.name}
    </span>
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={TagsIcon}
          title="Classificação de contatos"
          subtitle="Rótulos por intenção e estágio."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden /> Nova classificação
            </Button>
          }
        />

        <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar classificações...">
          <FilterBar.Chips
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'active', label: 'Ativas' },
              { value: 'inactive', label: 'Inativas' },
            ]}
            aria-label="Estado"
          />
        </FilterBar>

        <DataList
            data={loading ? [] : filteredItems}
            isLoading={loading}
            columns={[
              { header: 'Classificação', accessor: (item) => tagBadge(item) },
              {
                header: 'Descrição',
                accessor: (item) => (
                  <span className="text-foreground-muted line-clamp-2">{item.description || '—'}</span>
                ),
              },
              { header: 'Ordem', accessor: (item) => <span className="text-foreground-muted">{item.sort_order}</span> },
              {
                header: 'Estado',
                accessor: (item) => (
                  <Badge variant={item.is_active ? 'success' : 'warning'}>
                    {item.is_active ? 'Ativa' : 'Inativa'}
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
                menuAriaLabel={`Acções da classificação ${item.name}`}>
                <CardField label="Cor" icon={<TagsIcon size={14} aria-hidden />} value={tagBadge(item)} />
                <CardField
                  label="Estado"
                  value={
                    <Badge variant={item.is_active ? 'success' : 'warning'}>
                      {item.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  }
                />
                <CardField
                  label="Descrição"
                  icon={<FileText size={14} aria-hidden />}
                  value={item.description || 'Sem descrição — a IA usará o nome da classificação para classificar.'}
                  className="[&_span:last-child]:line-clamp-4"
                />
                <CardField label="Ordem" icon={<ListOrdered size={14} aria-hidden />} value={item.sort_order} />
              </DataCard>
            )}
            emptyState={
              items.length === 0 ? (
                <EmptyState
                  icon={TagsIcon}
                  title="Nenhuma classificação cadastrada"
                  description="Crie classificações para organizar contatos e orientar a IA no atendimento."
                />
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Nenhum resultado"
                  description="Nenhuma classificação corresponde ao filtro actual. Ajuste a busca ou o estado."
                />
              )
            }
          />

        <ModalForm
          formId="tag-form"
          isOpen={modalOpen}
          onClose={() => !saveLoading && setModalOpen(false)}
          icon={TagsIcon}
          title={editing ? 'Editar classificação' : 'Nova classificação'}
          subtitle="Ajuda a IA a classificar contatos."
          submitDisabled={saveLoading || !form.name.trim()}
          submitLoading={saveLoading}
          submitLabel={saveLoading ? 'Salvando…' : 'Salvar'}>
          <ModalBody>
            <form
              id="tag-form"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}>
              <ModalSection>
                <TextInput
                  label="Nome"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Alta prioridade"
                />
                <TextArea
                  label="Descrição (para a IA)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex.: Cliente demonstrou interesse claro em comprar ou agendar."
                  rows={3}
                />
                <div className="w-full space-y-1.5">
                  <Label className="block">Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_COLORS.map(({ value, label }) => {
                      const selected = form.color === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`h-9 w-9 rounded-full border-2 border-surface shadow transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            selected
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                              : 'ring-1 ring-border'
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
              </ModalSection>
            </form>
          </ModalBody>
        </ModalForm>

        <Modal
          variant="dialog"
          maxWidth="sm"
          isOpen={deleteId !== null}
          onClose={() => !deleteLoading && setDeleteId(null)}
          title="Remover classificação"
          subtitle="Contatos ficarão sem classificação."
          footer={
            <ModalFooterBar size="md">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLoading}
                onClick={() => deleteId && void remove(deleteId)}>
                {deleteLoading ? 'A remover…' : 'Remover'}
              </Button>
            </ModalFooterBar>
          }>
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

export default TagsPage;
