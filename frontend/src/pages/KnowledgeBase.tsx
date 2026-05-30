import React, { useMemo, useState } from "react";

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
} from "lucide-react";

import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Input";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
}

const KnowledgeBase: React.FC = () => {
  /*
  ====================================
  STATES
  ====================================
  */

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // IMPORTANTE:
  // Agora o toggle funciona 100%
  // e NÃO EXISTE mais a barra duplicada.
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  /*
  ====================================
  DATA
  ====================================
  */

  const [items] = useState<KnowledgeItem[]>([
    {
      id: "1",
      title: "Política de Reembolso",
      category: "Financeiro",
      content:
        "O cliente pode solicitar reembolso em até 7 dias após a compra.",
      updatedAt: "2h atrás",
    },
    {
      id: "2",
      title: "Horário de Atendimento",
      category: "Geral",
      content:
        "Nosso atendimento funciona de segunda a sábado das 08h às 18h.",
      updatedAt: "1 dia atrás",
    },
    {
      id: "3",
      title: "Como resetar senha",
      category: "Suporte Técnico",
      content:
        "Acesse o painel, clique em esqueci minha senha e siga os passos.",
      updatedAt: "3 dias atrás",
    },
    {
      id: "4",
      title: "Planos e Preços 2025",
      category: "Vendas",
      content: "Os planos variam entre Starter, Pro e Enterprise.",
      updatedAt: "5 dias atrás",
    },
  ]);

  /*
  ====================================
  FILTERS
  ====================================
  */

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "" || item.category === categoryFilter;

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

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* ==================================== */}
        {/* HERO */}
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
                <Button className="gap-2 h-12 px-6 rounded-2xl">
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

                  <div className="text-cyan-400 text-sm font-semibold">
                    Online
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Conteúdos</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {totalContents}
                  </h2>
                </div>
              </div>

              {/* CATEGORIES */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-violet-500/10">
                    <FolderKanban size={24} className="text-violet-400" />
                  </div>

                  <div className="text-violet-400 text-sm font-semibold">
                    Organizado
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Categorias</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {totalCategories}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================== */}
        {/* FILTER BAR */}
        {/* ==================================== */}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
          {/* TOP */}
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conteúdos..."
                className="
                  w-full h-12 pl-12 pr-4
                  rounded-2xl
                  border border-slate-800
                  bg-slate-950/70
                  text-white
                  placeholder:text-slate-500
                  outline-none
                  focus:border-cyan-500
                  transition
                "
              />
            </div>

            {/* FILTER */}
            <div className="w-full xl:w-80">
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10"
                />

                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-10"
                >
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
          {/* AQUI É O ÚNICO TOGGLE */}
          {/* NÃO EXISTE MAIS O DUPLICADO */}
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
        {/* EMPTY */}
        {/* ==================================== */}

        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center">
            <BookOpen size={64} className="mx-auto text-slate-700 mb-6" />

            <h3 className="text-2xl font-black text-white">
              Nenhum conteúdo encontrado
            </h3>

            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Adicione documentos, informações e materiais para treinar sua IA.
            </p>

            <Button className="mt-8">
              <Plus size={18} />
              Novo Conteúdo
            </Button>
          </div>
        ) : viewMode === "cards" ? (
          /* ==================================== */
          /* CARDS */
          /* ==================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-3xl
                  border border-slate-800
                  bg-slate-900/60
                  p-6
                  hover:border-cyan-500/30
                  transition-all duration-300
                  backdrop-blur-xl
                "
              >
                {/* BG EFFECT */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <FileText size={24} className="text-cyan-400" />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">
                          {item.title}
                        </h3>

                        <p className="text-sm text-cyan-400 font-semibold mt-1">
                          Conteúdo IA
                        </p>
                      </div>
                    </div>

                    <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition">
                      <MoreVertical
                        size={16}
                        className="text-slate-400"
                      />
                    </button>
                  </div>

                  {/* CONTENT */}
                  <div className="mt-8 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                        Categoria
                      </p>

                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-semibold">
                        <FolderKanban size={14} />
                        {item.category}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock3 size={14} />
                      {item.updatedAt}
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition">
                        <Eye size={16} className="text-cyan-400" />
                      </button>

                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition">
                        <Edit size={16} className="text-yellow-400" />
                      </button>

                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition">
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
          /* TABLE */
          /* ==================================== */
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/70 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Conteúdo
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Categoria
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Atualização
                    </th>

                    <th className="text-right px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                    >
                      {/* CONTENT */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                            <FileText size={20} className="text-cyan-400" />
                          </div>

                          <div>
                            <h3 className="font-bold text-white">
                              {item.title}
                            </h3>

                            <p className="text-sm text-slate-400 mt-1 max-w-[500px]">
                              {item.content}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-semibold">
                          <FolderKanban size={14} />
                          {item.category}
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Clock3 size={14} />
                          {item.updatedAt}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition">
                            <Eye size={16} className="text-cyan-400" />
                          </button>

                          <button className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition">
                            <Edit size={16} className="text-yellow-400" />
                          </button>

                          <button className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition">
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
      </div>
    </Layout>
  );
};

export default KnowledgeBase;