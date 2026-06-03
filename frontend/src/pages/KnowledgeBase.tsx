import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  BrainCircuit,
  Database,
  Sparkles,
  FolderKanban,
  Clock3,
  Filter,
  MoreVertical,
  Eye,
  LayoutGrid,
  Table2,
  Loader2,
  Check,
  FolderOpen
} from "lucide-react";

import { Button } from "../components/ui/Button";
import { Select, TextArea, Input as TextInput } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal, ModalBody, ModalFloatingButton, ModalFooterBar, ModalSection } from "../components/ui/Modal";
import api from "../services/api";

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
  /*
  ====================================
  STATES (UI, FILTERS & API)
  ====================================
  */
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KbItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /*
  ====================================
  API DATA FETCHING
  ====================================
  */
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

  /*
  ====================================
  CATEGORIES DERIVATION
  ====================================
  */
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || '').filter(Boolean))) as string[],
    [items]
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
/*
  ====================================
  STATS
  ====================================
  */
  const totalContents = items.length;
  const totalCategories = categories.length;

  /*
  ====================================
  ACTIONS & MODAL HANDLERS
  ====================================
  */
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
      <div className="space-y-8 animate-fade-in">
        {/* ==================================== */}
        {/* HERO (FUTURISTIC)                    */}
        {/* ==================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          {/* BG EFFECT */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500 blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
            {/* LEFT */}
            <div className="space-y-5 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  IA TREINÁVEL
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white flex items-center gap-4">
                  <BrainCircuit size={46} className="text-cyan-400" />
                  Base de Conhecimento
                </h1>
                <p className="text-slate-400 mt-4 max-w-2xl leading-relaxed">
                  Centralize informações estratégicas para treinar a IA com
                  dados da sua empresa e melhorar a precisão das respostas.
                </p>
              </div>

              {/* BUTTON */}
              <div className="pt-2">
                <Button className="gap-2 h-12 px-6 rounded-2xl" onClick={openCreate}>
                  <Plus size={18} />
                  Novo Conteúdo
                </Button>
              </div>

              {/* BADGES */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-sm font-semibold">
                  Base Inteligente
                </div>
                <div className="px-4 py-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400 text-sm font-semibold">
                  IA Aprendendo
                </div>
              </div>
            </div>

            {/* RIGHT STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {/* TOTAL */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-cyan-500/10">
                    <Database size={24} className="text-cyan-400" />
                  </div>
                  <div className="text-cyan-400 text-sm font-semibold">Online</div>
                </div>
                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Conteúdos</p>
                  <h2 className="text-4xl font-black text-white mt-2">
                    {loading ? <Loader2 size={24} className="animate-spin text-slate-500" /> : totalContents}
                  </h2>
                </div>
              </div>

              {/* CATEGORIES */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-violet-500/10">
                    <FolderKanban size={24} className="text-violet-400" />
                  </div>
                  <div className="text-violet-400 text-sm font-semibold">Organizado</div>
                </div>
                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Categorias</p>
                  <h2 className="text-4xl font-black text-white mt-2">
                    {loading ? <Loader2 size={24} className="animate-spin text-slate-500" /> : totalCategories}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================== */}
        {/* FILTER BAR                           */}
        {/* ==================================== */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
          {/* TOP */}
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conteúdos..."
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-800 bg-slate-950/70 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* FILTER */}
            <div className="w-full xl:w-80">
              <div className="relative">
                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pl-10">
                  <option value="">Todas as Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* VIEW MODE */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-200 ${
                  viewMode === "table"
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Table2 size={16} />
                Tabela
              </button>

              <button
                onClick={() => setViewMode("cards")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-200 ${
                  viewMode === "cards"
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <LayoutGrid size={16} />
                Cards
              </button>
            </div>
          </div>
        </section>

        {/* ==================================== */}
        {/* RENDER LIST OR EMPTY STATE           */}
        {/* ==================================== */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Loader2 className="animate-spin text-cyan-400" size={32} />
            <p className="text-sm font-medium">Carregando conteúdos reais da API...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center">
            <BookOpen size={64} className="mx-auto text-slate-700 mb-6" />
            <h3 className="text-2xl font-black text-white">Nenhum conteúdo encontrado</h3>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              {items.length === 0
                ? "Ainda não há artigos. Adicione títulos e textos sobre produtos, políticas e FAQs — serão utilizados pela IA quando forem pertinentes ao cliente."
                : "Nenhum resultado para o filtro atual."}
            </p>
            {items.length === 0 && (
              <Button className="mt-8" onClick={openCreate}>
                <Plus size={18} />
                Novo Conteúdo
              </Button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* ==================================== */
          /* CARDS VIEW                           */
          /* ==================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <FileText size={24} className="text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white truncate max-w-[180px]">{item.title}</h3>
                        <p className="text-sm text-cyan-400 font-semibold mt-1">Conteúdo IA</p>
                      </div>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="mt-8 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Categoria</p>
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-semibold">
                        <FolderKanban size={14} />
                        {item.category || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-4 min-h-[72px]">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock3 size={14} />
                      {formatUpdatedAt(item.updated_at)}
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition" onClick={() => openEdit(item)} title="Editar">
                        <Edit size={16} className="text-yellow-400" />
                      </button>
                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition" onClick={() => setDeleteId(item.id)} title="Excluir">
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ==================================== */
          /* TABLE VIEW                           */
          /* ==================================== */
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/70 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">Conteúdo</th>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">Categoria</th>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">Atualização</th>
                    <th className="text-right px-6 py-5 text-xs uppercase tracking-wider text-slate-500">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                            <FileText size={20} className="text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{item.title}</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-[400px] md:max-w-[500px] truncate">
                              {item.content}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-semibold">
                          <FolderKanban size={14} />
                          {item.category || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Clock3 size={14} />
                          {formatUpdatedAt(item.updated_at)}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition" onClick={() => openEdit(item)} title="Editar">
                            <Edit size={16} className="text-yellow-400" />
                          </button>
                          <button className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition" onClick={() => setDeleteId(item.id)} title="Excluir">
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* MODAL: FORM (CREATE / EDIT)          */}
        {/* ==================================== */}
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
                <TextInput
                  label="Categoria"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ex.: Geral, Suporte, Vendas"
                />
                <TextArea
                  label="Conteúdo"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Texto que a IA poderá usar nas respostas. Seja factual e objetivo."
                />
              </ModalSection>
            </form>
          </ModalBody>
        </Modal>

        {/* ==================================== */}
        {/* MODAL: DELETE CONFIRMATION           */}
        {/* ==================================== */}
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
            <p className="text-slate-400">
              Tem a certeza de que quer eliminar este artigo da base?
            </p>
          </ModalBody>
        </Modal>
      </div>
    </Layout>
  );
};

export default KnowledgeBase;