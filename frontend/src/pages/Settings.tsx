import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import {
  Settings,
  Users,
  History,
  Save,
  Clock3,
  Building2,
  Bot,
} from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import api from "../services/api";

type WorkingDay = {
  open: string;
  close: string;
  closed: boolean;
};

type WorkingHoursType = {
  [key: string]: WorkingDay;
};

const weekDays = [
  { key: "0", label: "Dom" },
  { key: "1", label: "Seg" },
  { key: "2", label: "Ter" },
  { key: "3", label: "Qua" },
  { key: "4", label: "Qui" },
  { key: "5", label: "Sex" },
  { key: "6", label: "Sáb" },
];

const defaultWorkingHours: WorkingHoursType = {
  "0": { open: "00:00", close: "00:00", closed: true },
  "1": { open: "08:00", close: "18:00", closed: false },
  "2": { open: "08:00", close: "18:00", closed: false },
  "3": { open: "08:00", close: "18:00", closed: false },
  "4": { open: "08:00", close: "18:00", closed: false },
  "5": { open: "08:00", close: "18:00", closed: false },
  "6": { open: "08:00", close: "13:00", closed: false },
};

const SettingsPage: React.FC = () => {
  const [companyName, setCompanyName] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [interactionTime, setInteractionTime] = useState(5);
  const [instanceName, setInstanceName] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  const [workingHours, setWorkingHours] =
    useState<WorkingHoursType>(defaultWorkingHours);

  const [activeTab, setActiveTab] = useState("general");

  const originalSettingsRef = useRef<any>(null);
  const isFetchingLogsRef = useRef(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const normalizeWorkingHours = (incomingHours: any): WorkingHoursType => {
    if (!incomingHours || typeof incomingHours !== "object") {
      return defaultWorkingHours;
    }

    const normalized: WorkingHoursType = { ...defaultWorkingHours };

    Object.keys(defaultWorkingHours).forEach((dayKey) => {
      if (incomingHours[dayKey]) {
        normalized[dayKey] = {
          open: incomingHours[dayKey]?.open || defaultWorkingHours[dayKey].open,

          close:
            incomingHours[dayKey]?.close || defaultWorkingHours[dayKey].close,

          closed:
            typeof incomingHours[dayKey]?.closed === "boolean"
              ? incomingHours[dayKey].closed
              : defaultWorkingHours[dayKey].closed,
        };
      }
    });

    return normalized;
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const response = await api.get("/api/settings");
      const settings = response.data;

      originalSettingsRef.current = settings;

      setCompanyName(settings?.company_name || "");
      setNotificationEmail(settings?.notification_email || "");
      setInteractionTime(settings?.delay_seconds || 5);

      try {
        const hoursResponse = await api.get("/api/business-hours");

        const receivedWorkingHours =
          hoursResponse.data?.working_hours || hoursResponse.data?.workingHours;

        if (receivedWorkingHours) {
          const normalizedHours = normalizeWorkingHours(receivedWorkingHours);

          setWorkingHours(normalizedHours);

          originalSettingsRef.current = {
            ...originalSettingsRef.current,
            workingHours: normalizedHours,
          };
        }
      } catch (hoursError) {
        console.error("Erro ao buscar horários de funcionamento:", hoursError);
      }

      await fetchLogs();

      const evolutionResponse = await api.get("/api/evolution/status");

      setChatbotEnabled(evolutionResponse.data.chatbotEnabled);

      setInstanceName(evolutionResponse.data.instanceName);
    } catch (error) {
      console.error("Erro ao buscar configurações gerais:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (isFetchingLogsRef.current) return;

    isFetchingLogsRef.current = true;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("TOKEN NÃO ENCONTRADO");
        return;
      }

      const logsResponse = await api.get("/api/logs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLogs(logsResponse.data || []);
    } catch (error: any) {
      console.error(
        "Erro ao sincronizar logs:",
        error?.response?.data || error,
      );
    } finally {
      isFetchingLogsRef.current = false;
    }
  };

  const handleToggleDay = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        closed: !prev[dayKey].closed,
      },
    }));
  };

  const handleHourChange = (
    dayKey: string,
    field: "open" | "close",
    value: string,
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);

      await api.post("/api/settings", {
        companyName,
        notificationEmail,
        chatbotEnabled,
        delaySeconds: interactionTime,
      });

      const formattedWorkingHours: WorkingHoursType = {};

      Object.keys(workingHours).forEach((dayKey) => {
        formattedWorkingHours[dayKey] = {
          open: workingHours[dayKey].open,
          close: workingHours[dayKey].close,
          closed: workingHours[dayKey].closed,
        };
      });

      await api.put("/api/business-hours", {
        workingHours: formattedWorkingHours,
        holidays: [],
      });

      originalSettingsRef.current = {
        company_name: companyName,
        notification_email: notificationEmail,
        delay_seconds: interactionTime,
        workingHours: formattedWorkingHours,
      };

      await fetchSettings();

      alert("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error(
        "Erro ao salvar configurações:",
        error?.response?.data || error,
      );

      alert("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (originalSettingsRef.current) {
      setCompanyName(originalSettingsRef.current.company_name || "");

      setNotificationEmail(
        originalSettingsRef.current.notification_email || "",
      );

      setInteractionTime(originalSettingsRef.current.delay_seconds || 5);

      if (originalSettingsRef.current.workingHours) {
        setWorkingHours(originalSettingsRef.current.workingHours);
      }
    }
  };

  const handleToggleChatbot = async () => {
    try {
      if (!instanceName) {
        alert("Instância não encontrada");
        return;
      }

      const newStatus = !chatbotEnabled;

      await api.post("/api/evolution/toggle-chatbot", {
        instanceName,
        enabled: newStatus,
      });

      setChatbotEnabled(newStatus);

      setTimeout(() => fetchLogs(), 800);

      alert(
        newStatus ? "Bot ativado com sucesso" : "Bot desativado com sucesso",
      );
    } catch (error) {
      console.error("Erro ao alterar bot:", error);

      alert("Erro ao alterar o status do chatbot.");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen text-white">
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[#0B1120] p-8 shadow-[0_10px_50px_rgba(0,0,0,0.45)]">
          {/* EFEITOS DE FUNDO */}
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_top_left,_#06B6D4,_transparent_35%)]" />

            <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_bottom_right,_#3B82F6,_transparent_30%)]" />
          </div>

          {/* BORDA INTERNA */}
          <div className="absolute inset-[1px] rounded-[31px] border border-white/5 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* ESQUERDA */}
            <div className="flex items-center gap-5">
              {/* ÍCONE */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-cyan-500 blur-xl opacity-20" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-500/20 bg-[#111827]">
                  <Settings size={36} className="text-cyan-400" />
                </div>
              </div>

              {/* TEXTOS */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />

                  <span className="text-cyan-400 text-sm font-semibold tracking-wide uppercase">
                    Sistema Online
                  </span>
                </div>

                <h1 className="mt-3 text-5xl font-black tracking-tight text-white">
                  Painel de Configurações
                </h1>

                <p className="mt-3 text-slate-400 text-lg max-w-2xl leading-relaxed">
                  Gerencie seu chatbot, horários de funcionamento e automações
                  inteligentes em um painel moderno e profissional.
                </p>
              </div>
            </div>

            {/* CARD STATUS */}
            <div className="min-w-[260px] rounded-3xl border border-slate-800 bg-[#111827]/80 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Chatbot</p>

                  <h3 className="text-2xl font-black text-white mt-1">
                    {chatbotEnabled ? "Ativado" : "Desativado"}
                  </h3>
                </div>

                <div
                  className={`h-4 w-4 rounded-full ${
                    chatbotEnabled
                      ? "bg-green-400 shadow-[0_0_20px_#4ade80]"
                      : "bg-red-400 shadow-[0_0_20px_#f87171]"
                  }`}
                />
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <p className="text-slate-500 text-sm">Tempo</p>

                  <span className="text-white font-bold text-lg">
                    {interactionTime}s
                  </span>
                </div>

                <div>
                  <p className="text-slate-500 text-sm">Logs</p>

                  <span className="text-white font-bold text-lg">
                    {logs.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
              activeTab === "general"
                ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              Geral
            </div>
          </button>

          <button
            onClick={() => setActiveTab("automation")}
            className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
              activeTab === "automation"
                ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} />
              Automação
            </div>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
              activeTab === "logs"
                ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              Logs
            </div>
          </button>
        </div>

        {/* GERAL */}
        {activeTab === "general" && (
          <div className="mt-8">
            <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <Building2 size={26} className="text-cyan-400" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">
                    Informações Gerais
                  </h2>

                  <p className="text-slate-400 text-sm">
                    Configure os dados principais da empresa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome da Empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />

                <Input
                  label="E-mail de Notificação"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                />
              </div>
            </Card>
          </div>
        )}

        {/* AUTOMAÇÃO */}
        {activeTab === "automation" && (
          <div className="mt-8 space-y-8">
            <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Status do Chatbot
                  </h2>

                  <p className="text-slate-400 mt-2">
                    Ative ou desative o chatbot.
                  </p>
                </div>

                <button
                  onClick={handleToggleChatbot}
                  className={`w-20 h-10 rounded-full relative transition-all duration-300 ${
                    chatbotEnabled
                      ? "bg-green-500 shadow-lg shadow-green-500/30"
                      : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-8 h-8 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                      chatbotEnabled ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </Card>

            <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <Clock3 size={24} className="text-cyan-400" />

                <div>
                  <h2 className="text-2xl font-black text-white">
                    Tempo de Interação
                  </h2>

                  <p className="text-slate-400 text-sm">
                    Tempo antes do bot responder.
                  </p>
                </div>
              </div>

              <div className="w-[220px]">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={interactionTime}
                  onChange={(e) => setInteractionTime(Number(e.target.value))}
                  className="w-full border border-slate-700 rounded-2xl px-5 py-4 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </Card>

            <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white">
                  Horário de Atendimento
                </h2>

                <p className="text-slate-400 mt-2">
                  Configure os dias e horários de funcionamento.
                </p>
              </div>

              {/* CHIPS */}
              <div className="flex flex-wrap gap-4 mb-8">
                {weekDays.map((day) => {
                  const dayData = workingHours[day.key];

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => handleToggleDay(day.key)}
                      className={`
                        px-6 py-4 rounded-2xl border transition-all duration-300
                        ${
                          !dayData.closed
                            ? "bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10"
                            : "bg-slate-900 border-slate-700 text-slate-500"
                        }
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-bold">{day.label}</span>

                        <span className="text-xs mt-1">
                          {dayData.closed ? "Fechado" : "Ativo"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* HORÁRIOS */}
              <div className="space-y-5">
                {weekDays.map((day) => {
                  const dayData = workingHours[day.key];

                  if (dayData.closed) return null;

                  return (
                    <div
                      key={day.key}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div>
                          <p className="text-cyan-400 font-black text-lg">
                            {day.label}
                          </p>

                          <p className="text-slate-500 text-sm">
                            Horário configurado
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <input
                            type="time"
                            value={dayData.open}
                            onChange={(e) =>
                              handleHourChange(day.key, "open", e.target.value)
                            }
                            className="border border-slate-700 rounded-2xl px-5 py-4 bg-[#0F172A] text-white"
                          />

                          <span className="text-slate-500 font-bold">até</span>

                          <input
                            type="time"
                            value={dayData.close}
                            onChange={(e) =>
                              handleHourChange(day.key, "close", e.target.value)
                            }
                            className="border border-slate-700 rounded-2xl px-5 py-4 bg-[#0F172A] text-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* LOGS */}
        {activeTab === "logs" && (
          <div className="mt-8">
            <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Logs do Sistema
                  </h2>

                  <p className="text-slate-400 mt-2">
                    Eventos importantes da automação.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-green-400">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>

                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Online
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {logs.length > 0 ? (
                  logs.map((log: any) => {
                    const levelStyles = {
                      SUCCESS:
                        "border-green-500/20 bg-green-500/10 text-green-400",

                      ERROR: "border-red-500/20 bg-red-500/10 text-red-400",

                      WARN: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",

                      INFO: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
                    };

                    return (
                      <div
                        key={log.id}
                        className={`rounded-3xl border p-5 transition-all duration-300 hover:scale-[1.01] ${
                          levelStyles[log.level as keyof typeof levelStyles]
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-black uppercase">
                            {log.level}
                          </span>

                          <span className="opacity-50">•</span>

                          <span className="text-xs opacity-70">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <p className="text-sm font-medium">{log.description}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <History size={50} className="mx-auto mb-4 opacity-40" />

                    <p>Nenhum log encontrado</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-4 mt-10">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            className="gap-2 px-6"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            <Save size={18} />

            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
