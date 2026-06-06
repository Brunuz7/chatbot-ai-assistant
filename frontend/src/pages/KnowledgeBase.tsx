import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { BookOpen, Plus, FileText, Edit, Trash2, Loader2, Clock, SearchX } from 'lucide-react';
import { STORE_CATEGORY } from '../utils/storeCatalog';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { TextArea, Input as TextInput } from '../components/ui/Input';
import { ModalForm, ModalBody, ModalFooterBar, ModalSection, Modal } from '../components/ui/Modal';
import { knowledgeService } from '../services/KnowledgeService';
import type { KbItem } from '../types/knowledge';
import { formatDateTimePt } from '../utils/format';
const emptyForm = { title: '', content: '' };

/** Alinhado ao limite em `KnowledgeBaseService` (backend). */
const KNOWLEDGE_CONTENT_MAX_LENGTH = 5_000;

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KbItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const items = await knowledgeService.list();
      setItems(items);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'store') navigate('/loja-integrada', { replace: true });
  }, [navigate, searchParams]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const articleItems = useMemo(
    () => items.filter((item) => item.category !== STORE_CATEGORY),
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return articleItems;
    return articleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q),
    );
  }, [articleItems, searchTerm]);

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
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaveLoading(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        category: null,
      };
      if (editing) {
        await knowledgeService.update(editing.id, payload);
      } else {
        await knowledgeService.create(payload);
      }
      setModalOpen(false);
      await fetchItems();
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      alert(msg ?? 'Não foi possível salvar. Verifique título e conteúdo.');
    } finally {
      setSaveLoading(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteLoading(true);
    try {
      await knowledgeService.delete(id);
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
          subtitle="Artigos usados pela IA nas respostas."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden /> Adicionar conteúdo
            </Button>
          }
        />

        <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar conteúdos..." />

        <DataList
          data={loading ? [] : filteredItems}
          isLoading={loading}
          columns={[
            {
              header: 'Título',
              accessor: 'title',
              className: 'font-bold text-foreground',
            },
            {
              header: 'Última atualização',
              accessor: (item) => formatDateTimePt(item.updated_at),
              className: 'text-foreground-muted',
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
              menuAriaLabel={`Acções do artigo ${item.title}`}>
              <CardField
                label="Conteúdo"
                icon={<FileText size={14} aria-hidden />}
                value={item.content}
                className="[&_span:last-child]:line-clamp-4"
              />
              <CardField
                label="Atualizado"
                icon={<Clock size={14} aria-hidden />}
                value={formatDateTimePt(item.updated_at)}
              />
            </DataCard>
          )}
          emptyState={
            articleItems.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nenhum artigo na base"
                description="Adicione títulos e textos sobre produtos, políticas e FAQs — a IA usa quando for pertinente ao cliente."
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhum resultado"
                description="Nenhum artigo corresponde ao filtro actual. Ajuste a busca."
              />
            )
          }
        />

        <ModalForm
          formId="knowledge-form"
          submitDisabled={saveLoading || !form.title.trim() || !form.content.trim()}
          submitLoading={saveLoading}
          submitLabel={saveLoading ? 'Salvando…' : 'Salvar'}
          isOpen={modalOpen}
          onClose={() => !saveLoading && setModalOpen(false)}
          icon={BookOpen}
          title={editing ? 'Editar artigo' : 'Novo artigo'}
          subtitle={
            editing
              ? 'Alterações aplicadas de imediato.'
              : 'Conteúdo para respostas da IA.'
          }>
          <ModalBody>
            <form
              id="knowledge-form"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}>
              <ModalSection>
                <TextInput
                  label="Título"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex.: Horário de atendimento"
                />
                <div className="space-y-1">
                  <TextArea
                    label="Conteúdo"
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={8}
                    maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH}
                    className="min-h-0 font-mono text-sm"
                    placeholder="Texto que a IA poderá usar nas respostas. Seja factual e objetivo."
                  />
                  <p className="text-right text-xs tabular-nums leading-normal text-slate-500">
                    {form.content.length.toLocaleString('pt-BR')} /{' '}
                    {KNOWLEDGE_CONTENT_MAX_LENGTH.toLocaleString('pt-BR')}
                  </p>
                </div>
              </ModalSection>
            </form>
          </ModalBody>
        </ModalForm>

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
                onClick={() => deleteId && void remove(deleteId)}>
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Remover
              </Button>
            </ModalFooterBar>
          }>
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
