import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import {
  Users,
  MoreVertical,
  Phone,
  Lock,
  Unlock,
  Save,
  X,
  Search,
  Shield,
  Clock3,
  User2,
  CalendarClock,
  Filter,
  LayoutGrid,
  Table2,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Input";
import api from "../services/api";


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

  /*
  ==========================================
  ADICIONE ESTES CAMPOS
  ==========================================
  */

  pushName?: string;
  profileName?: string;
  notify?: string;
  displayName?: string;
  shortName?: string;
  verifiedName?: string;
}

const Contacts: React.FC = () => {
  /*
  ==========================================
  STATES
  ==========================================
  */

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "blocked"
  >("all");

  /*
  ==========================================
  VIEW MODE
  ==========================================
  */

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState<"permanent" | "temporary">(
    "permanent",
  );
  const [blockUntil, setBlockUntil] = useState("");

  /*
  ==========================================
  FETCH CONTACTS
  ==========================================
  */

  const fetchContacts = async () => {
    try {
      const response = await api.get("/api/contacts");

      const filtered = response.data
        .filter((contact: Contact) => {
          const id = contact.whatsapp_id || contact.phone_number || "";

          return !id.endsWith("@g.us") && !id.includes("broadcast");
        })
        .map((contact: any) => ({
          ...contact,

          /*
    ==========================================
    AQUI ESTÁ A CORREÇÃO REAL
    ==========================================
    */

          name:
            contact.name ||
            contact.pushName ||
            contact.profileName ||
            contact.notify ||
            contact.displayName ||
            contact.shortName ||
            contact.verifiedName ||
            "Sem nome",
        }));

      setContacts(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBlockedContacts = async () => {
    try {
      const response = await api.get("/api/contacts/blocked");

      const normalized = response.data.map((contact: any) => ({
        ...contact,

          name:
          contact.name ||
          contact.pushName ||
          contact.profileName ||
          contact.notify ||
          contact.displayName ||
          contact.shortName ||
          contact.verifiedName ||
          "Sem nome",
      }));

      setBlockedContacts(normalized);
    } catch (error) {
      console.error(error);
    }
  };

  /*
  ==========================================
  INITIAL LOAD
  ==========================================
  */

  useEffect(() => {
    if (hasLoaded.current) return;

    hasLoaded.current = true;

    const loadData = async () => {
      try {
        setLoading(true);

        await Promise.all([fetchContacts(), fetchBlockedContacts()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /*
  ==========================================
  START BLOCK
  ==========================================
  */

  const startBlocking = (contact: Contact) => {
    setEditingContactId(contact.id);

    setBlockReason(contact.block_reason || "");

    setBlockType(contact.blocked_until ? "temporary" : "permanent");

    setBlockUntil(
      contact.blocked_until ? contact.blocked_until.slice(0, 16) : "",
    );

    setOpenMenu(null);
  };

  /*
  ==========================================
  SAVE BLOCK
  ==========================================
  */

  const saveBlock = async (contactId: string) => {
    try {
      setActionLoading(contactId);

      const finalBlockedUntil = blockType === "permanent" ? null : blockUntil;

      await api.patch(`/api/contacts/${contactId}/block`, {
        reason: blockReason || "Bloqueado manualmente",
        blockedUntil: finalBlockedUntil,
      });

      await Promise.all([fetchContacts(), fetchBlockedContacts()]);

      setEditingContactId(null);

      setBlockReason("");

      setBlockUntil("");
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  /*
  ==========================================
  UNBLOCK
  ==========================================
  */

  const unblockContact = async (id: string) => {
    try {
      setActionLoading(id);

      await api.patch(`/api/contacts/${id}/unblock`);

      await Promise.all([fetchContacts(), fetchBlockedContacts()]);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  /*
  ==========================================
  HELPERS
  ==========================================
  */

  const allContacts = useMemo(() => {
    const merged = [...contacts];

    blockedContacts.forEach((blocked) => {
      const exists = merged.find((c) => c.id === blocked.id);

      if (!exists) {
        merged.push(blocked);
      }
    });

    return merged;
  }, [contacts, blockedContacts]);

  const filteredContacts = useMemo(() => {
    return allContacts.filter((contact) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(contact.phone_number || "")
          .toLowerCase()
          .includes(search) ||
        String(contact.name || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !contact.blocked) ||
        (statusFilter === "blocked" && contact.blocked);

      return matchesSearch && matchesStatus;
    });
  }, [allContacts, searchTerm, statusFilter]);

  const formatDate = (date?: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* ==========================================
        HERO
        ========================================== */}

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
                <Users size={18} className="text-cyan-400" />

                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Central de Contatos
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white flex items-center gap-4">
                  <Users size={46} className="text-cyan-400" />
                  Painel de Contatos
                </h1>

                <p className="text-slate-400 mt-4 max-w-2xl leading-relaxed">
                  Gerencie usuários ativos, bloqueios automáticos, permissões e
                  monitore toda atividade do chatbot em tempo real.
                </p>
              </div>
            </div>

            {/* RIGHT STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
              {/* ATIVOS */}
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Contatos Ativos</p>

                    <h2 className="text-4xl font-black text-white mt-2">
                      {contacts.length}
                    </h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <Unlock size={24} className="text-emerald-400" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sistema operacional
                </div>
              </div>

              {/* BLOQUEADOS */}
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Bloqueados</p>

                    <h2 className="text-4xl font-black text-white mt-2">
                      {blockedContacts.length}
                    </h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <Shield size={24} className="text-red-400" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Proteção ativa
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
        FILTROS
        ========================================== */}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
          {/* TOP FILTERS */}
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
                placeholder="Buscar contatos..."
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
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "blocked",
                    )
                  }
                  className="pl-10"
                >
                  <option value="all">Todos os contatos</option>

                  <option value="active">Ativos</option>

                  <option value="blocked">Bloqueados</option>
                </Select>
              </div>
            </div>
          </div>

          {/* ==========================================
          VIEW MODE
          ========================================== */}

          {/* 
          REMOVIDO BLOCO DUPLICADO
          AGORA EXISTE APENAS UM CONTROLE TABLE/CARDS
          */}

          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition ${
                  viewMode === "table"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Table2 size={16} />
                Tabela
              </button>

              <button
                onClick={() => setViewMode("cards")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <LayoutGrid size={16} />
                Cards
              </button>
            </div>
          </div>
        </section>

        {/* ==========================================
        CONTENT
        ========================================== */}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={48} className="animate-spin text-cyan-400" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center">
            <Users size={64} className="mx-auto text-slate-700 mb-6" />

            <h3 className="text-2xl font-black text-white">
              Nenhum contato encontrado
            </h3>

            <p className="text-slate-400 mt-3">
              Nenhum contato corresponde aos filtros aplicados.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /*
          ==========================================
          CARDS MODE
          ==========================================
          */

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="
                  group relative overflow-hidden
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
                        <User2 size={24} className="text-cyan-400" />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">
                          {contact.name}
                        </h3>

                        <p className="text-sm text-cyan-400 font-semibold mt-1">
                          {contact.phone_number}
                        </p>
                      </div>
                    </div>

                    <div>
                      {contact.blocked ? (
                        <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="mt-8 space-y-5">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                        Motivo
                      </p>

                      <p className="text-slate-300 mt-2">
                        {contact.block_reason || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Expiração
                        </p>

                        <p className="text-sm text-white mt-2">
                          {contact.blocked_until
                            ? formatDate(contact.blocked_until)
                            : contact.blocked
                              ? "Permanente"
                              : "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Criado
                        </p>

                        <p className="text-sm text-white mt-2">
                          {formatDate(contact.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-8 pt-5 border-t border-slate-800">
                    {!contact.blocked ? (
                      <Button
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => startBlocking(contact)}
                      >
                        <Lock size={14} />
                        Bloquear contato
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => unblockContact(contact.id)}
                      >
                        <Unlock size={14} />
                        Desbloquear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /*
          ==========================================
          TABLE MODE
          ==========================================
          */

          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/70 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Usuário
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Telefone
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Motivo
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Expiração
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Criado em
                    </th>

                    <th className="text-right px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                    >
                      {/* USER */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                            <User2 size={20} className="text-cyan-400" />
                          </div>

                          <div>
                            <h3 className="font-bold text-white">
                              {contact.name}
                            </h3>

                            <p className="text-sm text-slate-500">
                              ID: {contact.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone size={15} />
                          {contact.phone_number}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        {contact.blocked ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
                            <Lock size={13} />
                            Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                            <Unlock size={13} />
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* MOTIVO */}
                      <td className="px-6 py-5 text-slate-300">
                        {editingContactId === contact.id ? (
                          <input
                            type="text"
                            placeholder="Motivo do bloqueio..."
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className="
                              w-full min-w-[200px]
                              rounded-xl
                              border border-white/10
                              bg-white/5
                              px-3 py-2
                              text-sm text-white
                              focus:outline-none
                              focus:border-cyan-400
                            "
                          />
                        ) : (
                          contact.block_reason || "-"
                        )}
                      </td>

                      {/* EXPIRAÇÃO */}
                      <td className="px-6 py-5">
                        {editingContactId === contact.id ? (
                          <div className="space-y-2 min-w-[220px]">
                            <select
                              value={blockType}
                              onChange={(e) =>
                                setBlockType(
                                  e.target.value as "permanent" | "temporary",
                                )
                              }
                              className="
                                w-full rounded-xl
                                border border-white/10
                                bg-zinc-900
                                px-3 py-2
                                text-sm text-white
                                focus:outline-none
                                focus:border-cyan-400
                              "
                            >
                              <option value="permanent">Permanente</option>

                              <option value="temporary">Temporário</option>
                            </select>

                            {blockType === "temporary" && (
                              <input
                                type="datetime-local"
                                value={blockUntil}
                                onChange={(e) => setBlockUntil(e.target.value)}
                                className="
                                  w-full rounded-xl
                                  border border-white/10
                                  bg-white/5
                                  px-3 py-2
                                  text-sm text-white
                                  focus:outline-none
                                  focus:border-cyan-400
                                "
                              />
                            )}
                          </div>
                        ) : !contact.blocked_until ? (
                          <span className="text-slate-400">
                            {contact.blocked ? "Permanente" : "-"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-300">
                            <CalendarClock size={15} />
                            {formatDate(contact.blocked_until)}
                          </div>
                        )}
                      </td>

                      {/* CREATED */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Clock3 size={14} />
                          {formatDate(contact.created_at)}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-5">
                        <div className="flex justify-end">
                          {editingContactId === contact.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveBlock(contact.id)}
                                disabled={actionLoading === contact.id}
                                className="
                                  p-2 rounded-xl
                                  bg-emerald-500/15
                                  border border-emerald-500/20
                                  text-emerald-400
                                  hover:bg-emerald-500/25
                                  transition
                                "
                              >
                                <Save size={18} />
                              </button>

                              <button
                                onClick={() => setEditingContactId(null)}
                                className="
                                  p-2 rounded-xl
                                  bg-red-500/15
                                  border border-red-500/20
                                  text-red-400
                                  hover:bg-red-500/25
                                  transition
                                "
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenMenu(
                                    openMenu === contact.id ? null : contact.id,
                                  )
                                }
                                className="
                                  p-2 rounded-xl
                                  bg-slate-800
                                  hover:bg-slate-700
                                  transition
                                  text-white
                                "
                              >
                                <MoreVertical size={18} />
                              </button>

                              {openMenu === contact.id && (
                                <div
                                  className="
                                    absolute right-0 top-12
                                    w-56 overflow-hidden
                                    rounded-2xl
                                    border border-slate-800
                                    bg-slate-900
                                    shadow-2xl
                                    z-50
                                  "
                                >
                                  {!contact.blocked ? (
                                    <button
                                      onClick={() => startBlocking(contact)}
                                      className="
                                        w-full px-4 py-3
                                        flex items-center gap-3
                                        hover:bg-red-500/10
                                        text-sm text-white
                                        transition
                                      "
                                    >
                                      <Lock
                                        size={16}
                                        className="text-red-400"
                                      />
                                      Configurar Bloqueio
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => unblockContact(contact.id)}
                                      className="
                                        w-full px-4 py-3
                                        flex items-center gap-3
                                        hover:bg-emerald-500/10
                                        text-sm text-white
                                        transition
                                      "
                                    >
                                      <Unlock
                                        size={16}
                                        className="text-emerald-400"
                                      />
                                      Desbloquear
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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

export default Contacts;
