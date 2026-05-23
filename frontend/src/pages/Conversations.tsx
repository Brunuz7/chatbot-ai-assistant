import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Phone,
} from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal, ModalBody, ModalSection } from '../components/ui/Modal';
import api from '../services/api';

type MessageDirection = 'in' | 'out';

interface ConversationMessage {
  direction: MessageDirection;
  content: string;
  timestamp: string;
}

interface ConversationItem {
  id: string;
  contactId: string;
  phoneNumber: string;
  whatsappId: string;
  contactName: string | null;
  messageCount: number;
  lastMessage: ConversationMessage | null;
  agentId: string | null;
  agentName: string | null;
  activeFlowId: string | null;
  activeFlowName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationDetail extends ConversationItem {
  messages: ConversationMessage[];
  context: unknown;
}

interface ConversationsResponse {
  items: ConversationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function displayContact(item: ConversationItem) {
  if (item.contactName) return item.contactName;
  return item.phoneNumber;
}

function DirectionBadge({ direction }: { direction: MessageDirection }) {
  return direction === 'in' ? (
    <Badge variant="info" className="inline-flex items-center gap-1">
      <ArrowDownLeft size={12} aria-hidden />
      Cliente
    </Badge>
  ) : (
    <Badge variant="success" className="inline-flex items-center gap-1">
      <ArrowUpRight size={12} aria-hidden />
      Assistente
    </Badge>
  );
}

function ContactCell({ item }: { item: ConversationItem }) {
  return (
    <div>
      <p className="font-medium text-slate-900 dark:text-white">{displayContact(item)}</p>
      <p className="text-xs text-slate-500">{item.phoneNumber}</p>
    </div>
  );
}

function ConversationCard({
  item,
  onOpen,
}: {
  item: ConversationItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white truncate">
            {displayContact(item)}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone size={12} aria-hidden />
            {item.phoneNumber}
          </p>
        </div>
        <Badge variant="outline">{item.messageCount} msgs</Badge>
      </div>
      {item.lastMessage ? (
        <div className="space-y-2">
          <DirectionBadge direction={item.lastMessage.direction} />
          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
            {item.lastMessage.content}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Sem mensagens registadas</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Actualizado {formatWhen(item.updatedAt)}</span>
        {item.agentName ? <span>Agente: {item.agentName}</span> : null}
      </div>
    </button>
  );
}

const Conversations: React.FC = () => {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await api.get<ConversationsResponse>('/api/conversations', {
          params: {
            page,
            limit,
            search: debouncedSearch || undefined,
          },
        });
        setItems(res.data?.items ?? []);
        setPagination(
          res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
        );
      } catch (e) {
        console.error(e);
        setItems([]);
        setPagination({ page: 1, limit, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, debouncedSearch],
  );

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<ConversationDetail>(`/api/conversations/${id}`);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Actualizado',
        accessor: (item: ConversationItem) => (
          <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
            {formatWhen(item.updatedAt)}
          </span>
        ),
      },
      {
        header: 'Contato',
        accessor: (item: ConversationItem) => <ContactCell item={item} />,
      },
      {
        header: 'Última mensagem',
        accessor: (item: ConversationItem) =>
          item.lastMessage ? (
            <div className="space-y-1 max-w-md">
              <DirectionBadge direction={item.lastMessage.direction} />
              <p className="line-clamp-2 text-sm" title={item.lastMessage.content}>
                {item.lastMessage.content}
              </p>
            </div>
          ) : (
            <span className="text-slate-400 text-sm">—</span>
          ),
        className: 'max-w-md',
      },
      {
        header: 'Mensagens',
        accessor: (item: ConversationItem) => (
          <Badge variant="outline">{item.messageCount}</Badge>
        ),
      },
      {
        header: 'Agente',
        accessor: (item: ConversationItem) => (
          <span className="text-slate-500 dark:text-slate-400">
            {item.agentName ?? '—'}
          </span>
        ),
      },
      {
        header: 'Fluxo',
        accessor: (item: ConversationItem) => (
          <span className="text-slate-500 dark:text-slate-400 text-sm">
            {item.activeFlowName ?? '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const canPrev = pagination.page > 1;
  const canNext = pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={MessageSquare}
          title="Conversas"
          subtitle="Conversas da sua conta. Histórico limitado por conversa; registos com mais de 30 dias sem actividade são removidos automaticamente."
          actions={
            <Button
              variant="outline"
              className="h-11 w-full gap-2 sm:h-auto sm:w-auto"
              disabled={loading || refreshing}
              onClick={() => void fetchConversations(true)}
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw size={18} aria-hidden />
              )}
              Actualizar
            </Button>
          }
        />

        <FilterBar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          searchPlaceholder="Buscar por telefone ou nome do contato…"
          onClear={() => {
            setSearchTerm('');
            setPage(1);
          }}
        >
          <Select
            label="Itens por página"
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </FilterBar>

        <DataList
          data={items}
          columns={columns}
          isLoading={loading}
          onRowClick={(item) => void openDetail(item.id)}
          renderCard={(item) => (
            <ConversationCard item={item} onOpen={() => void openDetail(item.id)} />
          )}
          emptyState={
            !loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-6 py-12 text-center">
                <MessageSquare className="mx-auto mb-3 size-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nenhuma conversa encontrada
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  As conversas aparecem quando o chatbot processa mensagens. Mantemos apenas os últimos 30 dias.
                </p>
              </div>
            ) : null
          }
        />

        {pagination.total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pagination.total} conversa{pagination.total !== 1 ? 's' : ''} · página{' '}
              {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} aria-hidden />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={detailOpen}
        onClose={() => !detailLoading && setDetailOpen(false)}
        icon={MessageSquare}
        pageWidth="lg"
        title={detail ? displayContact(detail) : 'Conversa'}
        subtitle={
          detail
            ? `${detail.phoneNumber} · ${detail.messageCount} mensagem${detail.messageCount !== 1 ? 's' : ''}`
            : 'A carregar histórico…'
        }
      >
        <ModalBody>
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : detail ? (
            <ModalSection title="Mensagens">
              <ul className="space-y-3 max-h-[min(60vh,520px)] overflow-y-auto pr-1 custom-scrollbar">
                {detail.messages.length === 0 ? (
                  <li className="text-sm text-slate-500 italic">Sem mensagens nesta conversa.</li>
                ) : (
                  detail.messages.map((msg, i) => (
                    <li
                      key={`${msg.timestamp}-${i}`}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        msg.direction === 'in'
                          ? 'border-blue-200/60 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/10'
                          : 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <DirectionBadge direction={msg.direction} />
                        <span className="text-xs text-slate-500">{formatWhen(msg.timestamp)}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              {(detail.agentName || detail.activeFlowName) && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
                  {detail.agentName ? <p>Agente: {detail.agentName}</p> : null}
                  {detail.activeFlowName ? (
                    <p>
                      Fluxo activo: {detail.activeFlowName}
                    </p>
                  ) : null}
                </div>
              )}
            </ModalSection>
          ) : null}
        </ModalBody>
      </Modal>
    </Layout>
  );
};

export default Conversations;
