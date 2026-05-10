import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { PageHeader } from "../components/PageHeader";
import axios from "axios";
import { Users, MessageCircle, MoreVertical, Phone } from "lucide-react";

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

  // Aba ativa
  const [activeTab, setActiveTab] = useState<"active" | "blocked">("active");

  //------------------------------------------
  // Buscar contatos ativos
  //------------------------------------------
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:3001/api/contacts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const filteredContacts = response.data.filter((contact: any) => {
        const id = contact.whatsapp_id || contact.remoteJid || contact.id || "";

        return !id.endsWith("@g.us") && !id.includes("broadcast");
      });

      setContacts(filteredContacts);
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
    }
  };

  //------------------------------------------
  // Buscar contatos bloqueados
  //------------------------------------------
  const fetchBlockedContacts = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:3001/api/contacts/blocked",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setBlockedContacts(response.data);
    } catch (error) {
      console.error("Erro ao buscar contatos bloqueados:", error);
    }
  };

  //------------------------------------------
  // Bloquear contato
  //------------------------------------------
  const blockContact = async (id: string) => {
    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `http://localhost:3001/api/contacts/${id}/block`,
        {
          reason: "Bloqueado manualmente",
          blockHours: 24,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await fetchContacts();
      await fetchBlockedContacts();
    } catch (error) {
      console.error("Erro ao bloquear contato:", error);
    }
  };

  //------------------------------------------
  // Desbloquear contato
  //------------------------------------------
  const unblockContact = async (id: string) => {
    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `http://localhost:3001/api/contacts/${id}/unblock`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await fetchContacts();
      await fetchBlockedContacts();
    } catch (error) {
      console.error("Erro ao desbloquear contato:", error);
    }
  };

  //------------------------------------------
  // Carregar ao abrir página
  //------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      await fetchContacts();
      await fetchBlockedContacts();
      setLoading(false);
    };

    loadData();
  }, []);

  //------------------------------------------
  // Escolhe qual lista mostrar
  //------------------------------------------
  const currentList = activeTab === "active" ? contacts : blockedContacts;

  //------------------------------------------
  // Busca
  //------------------------------------------
  const filteredContacts = currentList.filter((contact) =>
    contact.phone_number.includes(searchTerm),
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Users}
          title="Contatos"
          subtitle="Lista do WhatsApp, bloqueios e exportação."
          actions={
            <Button variant="primary" className="h-11 w-full sm:h-auto sm:w-auto">
              Exportar CSV
            </Button>
          }
        />

        {/* Tabs */}
        <div className="flex gap-3">
          <Button
            variant={activeTab === "active" ? "primary" : "outline"}
            onClick={() => setActiveTab("active")}
          >
            Contatos Ativos ({contacts.length})
          </Button>

          <Button
            variant={activeTab === "blocked" ? "primary" : "outline"}
            onClick={() => setActiveTab("blocked")}
          >
            Bloqueados ({blockedContacts.length})
          </Button>
        </div>

        {/* Busca */}
        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar por número..."
          activeFiltersCount={0}
          onClear={() => setSearchTerm("")}
        >
          <div />
        </FilterBar>

        {/* Lista */}
        {loading ? (
          <div className="text-center">Carregando contatos...</div>
        ) : (
          <DataList
            data={filteredContacts}
            columns={[
              {
                header: "Whatsapp",
                accessor: (contact: Contact) => (
                  <div>
                    <div className="font-bold">
                      {contact.name || "Sem nome"}
                    </div>

                  </div>
                ),
              },

              {
                header: "Contato",
                accessor: (contact: Contact) => {
                  const number = (
                    contact.whatsapp_id || contact.phone_number
                  ).replace("@s.whatsapp.net", "");

                  return (
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      {number}
                    </div>
                  );
                },
              },

              {
                header: "Status",
                accessor: (contact: Contact) => (
                  <span
                    className={
                      contact.blocked ? "text-red-500" : "text-green-500"
                    }
                  >
                    {contact.blocked ? "Bloqueado" : "Ativo"}
                  </span>
                ),
              },

              {
                header: "Motivo",
                accessor: (contact: Contact) => contact.block_reason || "-",
              },

              {
                header: "Bloqueado até",
                accessor: (contact: Contact) =>
                  contact.blocked_until
                    ? new Date(contact.blocked_until).toLocaleString("pt-BR")
                    : "-",
              },

              {
                header: "Ações",
                accessor: (contact: Contact) => (
                  <div className="flex gap-2">
                    {contact.blocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockContact(contact.id)}
                      >
                        Desbloquear
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => blockContact(contact.id)}
                      >
                        Bloquear
                      </Button>
                    )}

                    {/* <Button variant="outline" size="sm">
                      <MessageCircle size={16} />
                    </Button> */}

                    <Button variant="outline" size="sm">
                      <MoreVertical size={16} />
                    </Button>
                  </div>
                ),
              },
            ]}
            renderCard={(contact: Contact) => (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border">
                <h3 className="font-bold">{contact.phone_number}</h3>

                <p className="text-sm text-gray-500">{contact.whatsapp_id}</p>

                <div className="mt-3">
                  {contact.blocked ? (
                    <Button
                      variant="outline"
                      onClick={() => unblockContact(contact.id)}
                    >
                      Desbloquear
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => blockContact(contact.id)}
                    >
                      Bloquear
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
