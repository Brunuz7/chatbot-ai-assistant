import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import {
  Users,
  MoreVertical,
  Phone,
  Lock,
  Unlock,
  Save,
  X,
} from "lucide-react";

import { DataList } from "../components/ui/DataList";
import { Button } from "../components/ui/Button";
import { FilterBar } from "../components/ui/FilterBar";
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
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"active" | "blocked">("active");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const hasLoaded = useRef(false);

  /*
  =============================
  INLINE EDIT STATE
  =============================
  */
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockUntil, setBlockUntil] = useState("");

  /*
  =============================
  FETCH CONTACTS
  =============================
  */
  const fetchContacts = async () => {
    try {
      const response = await api.get("/api/contacts");

      const filtered = response.data.filter((contact: Contact) => {
        const id = contact.whatsapp_id || contact.phone_number || "";

        return !id.endsWith("@g.us") && !id.includes("broadcast");
      });

      setContacts(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBlockedContacts = async () => {
    try {
      const response = await api.get("/api/contacts/blocked");
      setBlockedContacts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  /*
  =============================
  START INLINE BLOCK
  =============================
  */
  const startBlocking = (contact: Contact) => {
    setEditingContactId(contact.id);

    setBlockReason(contact.block_reason || "");

    setBlockUntil(
      contact.blocked_until ? contact.blocked_until.slice(0, 16) : "",
    );

    setOpenMenu(null);
  };
  /*
  =============================
  SAVE BLOCK
  =============================
  */
  const saveBlock = async (contactId: string) => {
    try {
      setActionLoading(contactId);

      console.log("blockUntil frontend:", blockUntil);

      await api.patch(`/api/contacts/${contactId}/block`, {
        reason: blockReason || "Bloqueado manualmente",

        blockedUntil: blockUntil || null,
      });

      await Promise.all([fetchContacts(), fetchBlockedContacts()]);

      setEditingContactId(null);
      setBlockReason("");
      setBlockUntil("");
    } catch (error) {
      console.error("Erro ao bloquear:", error);
    } finally {
      setActionLoading(null);
    }
  };

  /*
  =============================
  UNBLOCK
  =============================
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
  =============================
  INITIAL LOAD
  =============================
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

  const currentList = activeTab === "active" ? contacts : blockedContacts;

  const filteredContacts = currentList.filter((contact) =>
    contact.phone_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white flex gap-3 items-center">
              <Users />
              Contatos
            </h1>
          </div>
        </header>

        {/* TABS */}
        <div className="flex gap-3">
          <Button
            variant={activeTab === "active" ? "primary" : "outline"}
            onClick={() => setActiveTab("active")}
          >
            Ativos ({contacts.length})
          </Button>

          <Button
            variant={activeTab === "blocked" ? "primary" : "outline"}
            onClick={() => setActiveTab("blocked")}
          >
            Bloqueados ({blockedContacts.length})
          </Button>
        </div>

        {/* SEARCH */}
        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar número..."
          activeFiltersCount={0}
          onClear={() => setSearchTerm("")}
        >
          <div />
        </FilterBar>

        {/* TABLE */}
        {loading ? (
          <div className="text-center py-10 text-white">Carregando...</div>
        ) : (
          <DataList
            data={filteredContacts}
            columns={[
              {
                header: "Nome",
                accessor: (contact: Contact) => contact.name || "Sem nome",
              },

              {
                header: "Número",
                accessor: (contact: Contact) => (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {contact.phone_number}
                  </div>
                ),
              },

              {
                header: "Status",
                accessor: (contact: Contact) => {
                  const now = new Date();

                  const isTemporarilyBlocked =
                    contact.blocked &&
                    contact.blocked_until &&
                    new Date(contact.blocked_until) > now;

                  return (
                    <span
                      className={
                        isTemporarilyBlocked ? "text-red-400" : "text-green-400"
                      }
                    >
                      {isTemporarilyBlocked ? "Bloqueado" : "Ativo"}
                    </span>
                  );
                },
              },

              {
                header: "Motivo",
                accessor: (contact: Contact) => contact.block_reason || "-",
              },

              {
                header: "Bloqueado até",
                accessor: (contact: Contact) => {
                  if (!contact.blocked_until) {
                    return "-";
                  }

                  const date = new Date(contact.blocked_until);

                  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString(
                    "pt-BR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}`;
                },
              },

              {
                header: "Ações",
                accessor: (contact: Contact) => (
                  <div className="relative flex gap-2">
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === contact.id ? null : contact.id)
                      }
                      className="
              p-2 rounded-lg
              bg-white/10
              border border-white/10
              hover:bg-white/20
            "
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openMenu === contact.id && (
                      <div
                        className="
                absolute right-0 top-10
                w-44 z-50
                bg-white/10
                backdrop-blur-xl
                border border-cyan-400/20
                rounded-xl
              "
                      >
                        {!contact.blocked ? (
                          <button
                            onClick={() => startBlocking(contact)}
                            className="
                    w-full px-4 py-3 text-left
                    hover:bg-red-500/20
                    flex items-center gap-2
                  "
                          >
                            <Lock size={16} />
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => unblockContact(contact.id)}
                            className="
                    w-full px-4 py-3 text-left
                    hover:bg-green-500/20
                    flex items-center gap-2
                  "
                          >
                            <Unlock size={16} />
                            Desbloquear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
            /*
   AQUI ESTÁ A CORREÇÃO
  */
            renderCard={(contact: Contact) => (
              <div
                key={contact.id}
                className="
        bg-white/5
        border border-white/10
        rounded-2xl
        p-5
        space-y-4
      "
              >
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {contact.name || "Sem nome"}
                  </h3>

                  <p className="text-gray-400 flex items-center gap-2">
                    <Phone size={14} />
                    {contact.phone_number}
                  </p>
                </div>

                <div>
                  <span
                    className={
                      contact.blocked ? "text-red-400" : "text-green-400"
                    }
                  >
                    {contact.blocked ? "Bloqueado" : "Ativo"}
                  </span>
                </div>

                <div className="text-sm text-gray-400">
                  <p>
                    <strong>Motivo:</strong> {contact.block_reason || "-"}
                  </p>

                  <p>
                    <strong>Bloqueado até:</strong>{" "}
                    {contact.blocked_until
                      ? new Date(contact.blocked_until).toLocaleString("pt-BR")
                      : "-"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!contact.blocked ? (
                    <Button
                      variant="primary"
                      onClick={() => startBlocking(contact)}
                    >
                      <Lock size={14} />
                      Bloquear
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => unblockContact(contact.id)}
                    >
                      <Unlock size={14} />
                      Desbloquear
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </Layout>
  );
};

export default Contacts;
