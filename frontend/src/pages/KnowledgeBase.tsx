import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { BookOpen, Plus, FileText, Edit, Trash2, Loader2, Check, FolderOpen, Clock } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Select, TextArea, Input as TextInput } from '../components/ui/Input';
import { Modal, ModalBody, ModalFloatingButton, ModalFooterBar, ModalSection } from '../components/ui/Modal';
import api from '../services/api';

interface KbItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = { title: '', content: '', category: '' };

function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const KnowledgeBase: React.FC = () => {
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KbItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<KbItem[]>('/api/knowledge');
      setItems(res.data ?? []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || '').filter(Boolean))) as string[],
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === '' || (item.category || '') === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: KbItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaveLoading(true);
    try {
      if (editing) {
        await api.put(`/api/knowledge/${editing.id}`, {
          title: form.title,
          content: form.content,
          category: form.category.trim() || null,
        });
      } else {
        await api.post('/api/knowledge', {
          title: form.title,
          content: form.content,
          category: form.category.trim() || null,
        });
      }
      setModalOpen(false);
      await fetchItems();
    } catch (e) {
      console.error(e);
      alert('Não foi possível salvar. Verifique título e conteúdo.');
    } finally {
      setSaveLoading(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/knowledge/${id}`);
      setDeleteId(null);
      await fetchItems();
    } catch (e) {
      console.error(e);
      alert('Não foi possível remover o artigo.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={BookOpen}
          title="Base de conhecimento"
          subtitle="Artigos da sua conta: a IA prioriza trechos relevantes para a mensagem do cliente (palavras-chave no título, texto e categoria)."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden /> Adicionar conteúdo
            </Button>
          }
        />

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar conteúdos..."
          activeFiltersCount={categoryFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setCategoryFilter('');
          }}
        >
          <div className="w-full">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
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
            itemLabel="artigo"
            columns={[
              {
                header: 'Título',
                accessor: (item) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                      <FileText size={20} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                ),
              },
              {
                header: 'Categoria',
                accessor: (item) =>
                  item.category ? (
                    <Badge variant="default">{item.category}</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                header: 'Última actualização',
                accessor: (item) => (
                  <span className="text-slate-500">{formatUpdatedAt(item.updated_at)}</span>
                ),
                className: 'text-slate-500',
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
                title={item.title}
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
                menuAriaLabel={`Acções do artigo ${item.title}`}
              >
                <CardField
                  label="Categoria"
                  icon={<FolderOpen size={14} aria-hidden />}
                  value={
                    item.category ? <Badge variant="default">{item.category}</Badge> : '—'
                  }
                />
                <CardField
                  label="Conteúdo"
                  icon={<FileText size={14} aria-hidden />}
                  value={item.content}
                  className="[&_span:last-child]:line-clamp-4"
                />
                <CardField
                  label="Actualizado"
                  icon={<Clock size={14} aria-hidden />}
                  value={formatUpdatedAt(item.updated_at)}
                />
              </DataCard>
            )}
          />
        )}

        {!loading && filteredItems.length === 0 && (
          <p className="py-8 text-center text-slate-500">
            {items.length === 0
              ? 'Ainda não há artigos. Adicione títulos e textos sobre produtos, políticas e FAQs — serão utilizados pela IA quando forem pertinentes ao cliente.'
              : 'Nenhum resultado para o filtro actual.'}
          </p>
        )}

        <Modal
          variant="form"
          pageWidth="xl"
          isOpen={modalOpen}
          onClose={() => !saveLoading && setModalOpen(false)}
          icon={BookOpen}
          title={editing ? 'Editar artigo' : 'Novo artigo'}
          subtitle={
            editing
              ? 'As alterações entram logo no ranking da base de conhecimento.'
              : 'Conteúdo que a IA pode usar quando for relevante para o cliente.'
          }
          floatingAction={
            <ModalFloatingButton
              type="submit"
              form="knowledge-form"
              disabled={saveLoading || !form.title.trim() || !form.content.trim()}
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
            id="knowledge-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
          <ModalSection>
            <TextInput
              label="Título"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex.: Horário de atendimento"
            />
            <TextArea
              label="Conteúdo"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={14}
              className="font-mono text-sm"
              placeholder="Texto que a IA poderá usar nas respostas. Seja factual e objetivo."
            />
          </ModalSection>
          </form>
          </ModalBody>
        </Modal>

        <Modal
          variant="dialog"
          maxWidth="md"
          icon={Trash2}
          isOpen={deleteId !== null}
          onClose={() => !deleteLoading && setDeleteId(null)}
          title="Remover artigo"
          subtitle="Esta operação não pode ser desfeita."
          footer={
            <ModalFooterBar size="md">
              <Button variant="outline" type="button" disabled={deleteLoading} onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLoading}
                onClick={() => deleteId && void remove(deleteId)}
              >
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Remover
              </Button>
            </ModalFooterBar>
          }
        >
          <ModalBody>
            <p className="text-slate-600 dark:text-slate-400">
              Tem a certeza de que quer eliminar este artigo da base?
            </p>
          </ModalBody>
        </Modal>
      </div>
    </Layout>
  );
};

export default KnowledgeBase;
