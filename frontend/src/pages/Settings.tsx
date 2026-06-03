import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import {
  Settings,
  Users,
  History,
  Save,
  Clock3,
  Building2,
  Bot,
  Mic,
  Loader2,
} from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import api from "../services/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "../utils/apiError";

// Tipagens e Constantes do Sistema
type WorkingDay = {
  open: string;
  close: string;
  closed: boolean;
};

type WorkingHoursType = {
  [key: string]: WorkingDay;
};

type TtsVoiceType = "preset" | "clone";

interface UserSettings {
  company_name?: string;
  notification_email?: string;
  delay_seconds?: number;
  tts_reply_enabled: boolean;
  tts_voice_type?: TtsVoiceType;
  tts_voice: string;
  tts_model: string;
  tts_max_chars: number;
}

interface VoiceCloneStatus {
  has_cloned_voice: boolean;
  mistral_configured: boolean;
  tts_voice_type: TtsVoiceType;
}

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

const TTS_VOICES = [
  { id: "nova", label: "Nova" },
  { id: "alloy", label: "Alloy" },
  { id: "shimmer", label: "Shimmer" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
  { id: "onyx", label: "Onyx" },
  { id: "coral", label: "Coral" },
  { id: "sage", label: "Sage" },
];

const SettingsPage: React.FC = () => {
  // Estados Gerais
  const [companyName, setCompanyName] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [interactionTime, setInteractionTime] = useState(5);
  const [instanceName, setInstanceName] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursType>(defaultWorkingHours);
  const [activeTab, setActiveTab] = useState("general");

  // Estados específicos de Áudio (TTS)
  const [savingTts, setSavingTts] = useState(false);
  const [uploadingClone, setUploadingClone] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoiceType, setTtsVoiceType] = useState<TtsVoiceType>("preset");
  const [ttsVoice, setTtsVoice] = useState("nova");
  const [ttsMaxChars, setTtsMaxChars] = useState(500);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  const [mistralConfigured, setMistralConfigured] = useState(false);

  const originalSettingsRef = useRef<any>(null);
  const isFetchingLogsRef = useRef(false);

  const normalizeWorkingHours = (incomingHours: any): WorkingHoursType => {
    if (!incomingHours || typeof incomingHours !== "object") {
      return defaultWorkingHours;
    }
    const normalized: WorkingHoursType = { ...defaultWorkingHours };
    Object.keys(defaultWorkingHours).forEach((dayKey) => {
      if (incomingHours[dayKey]) {
        normalized[dayKey] = {
          open: incomingHours[dayKey]?.open || defaultWorkingHours[dayKey].open,
          close: incomingHours[dayKey]?.close || defaultWorkingHours[dayKey].close,
          closed:
            typeof incomingHours[dayKey]?.closed === "boolean"
              ? incomingHours[dayKey].closed
              : defaultWorkingHours[dayKey].closed,
        };
      }
    });
    return normalized;
  };
const fetchLogs = async () => {
    if (isFetchingLogsRef.current) return;
    isFetchingLogsRef.current = true;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const logsResponse = await api.get("/api/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(logsResponse.data || []);
    } catch (error: any) {
      console.error("Erro ao sincronizar logs:", error?.response?.data || error);
    } finally { // 👈 Mudado de 'file' para 'finally' aqui
      isFetchingLogsRef.current = false;
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Chamadas paralelas para otimizar o carregamento
      const [settingsRes, cloneRes, evolutionRes] = await Promise.all([
        api.get<UserSettings>("/api/settings"),
        api.get<VoiceCloneStatus>("/api/settings/voice-clone"),
        api.get("/api/evolution/status").catch(() => ({ data: { chatbotEnabled: false, instanceName: "" } })),
      ]);

      const settings = settingsRes.data;
      originalSettingsRef.current = settings;

      // Mapeamento das configurações gerais
      setCompanyName(settings?.company_name || "");
      setNotificationEmail(settings?.notification_email || "");
      setInteractionTime(settings?.delay_seconds || 5);

      // Mapeamento das configurações do Chatbot Evolution
      setChatbotEnabled(evolutionRes.data.chatbotEnabled);
      setInstanceName(evolutionRes.data.instanceName);

      // Mapeamento das configurações de Áudio (TTS)
      setTtsEnabled(settings.tts_reply_enabled === true);
      setHasClonedVoice(cloneRes.data.has_cloned_voice === true);
      setMistralConfigured(cloneRes.data.mistral_configured === true);
      setTtsVoiceType(
        settings.tts_voice_type === "clone" && cloneRes.data.has_cloned_voice
          ? "clone"
          : "preset"
      );
      setTtsVoice(settings.tts_voice || "nova");
      setTtsMaxChars(
        typeof settings.tts_max_chars === "number" && settings.tts_max_chars > 0
          ? settings.tts_max_chars
          : 500
      );

      // Carregamento de horários comerciais
      try {
        const hoursResponse = await api.get("/api/business-hours");
        const receivedWorkingHours = hoursResponse.data?.working_hours || hoursResponse.data?.workingHours;

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
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      toast.error("Não foi possível carregar as configurações do sistema.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Manipuladores de Horários
  const handleToggleDay = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], closed: !prev[dayKey].closed },
    }));
  };

  const handleHourChange = (dayKey: string, field: "open" | "close", value: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  // Salvar Configurações Gerais e de Automação
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
        ...originalSettingsRef.current,
        company_name: companyName,
        notification_email: notificationEmail,
        delay_seconds: interactionTime,
        workingHours: formattedWorkingHours,
      };

      toast.success("Configurações salvas com sucesso!");
      void fetchSettings();
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error?.response?.data || error);
      toast.error("Erro ao salvar configurações gerais.");
    } finally {
      setLoading(false);
    }
  };

  // Salvar Configurações de Áudio (TTS)
  const saveTtsReply = async () => {
    setSavingTts(true);
    try {
      const res = await api.patch<UserSettings>("/api/settings/tts-reply", {
        tts_reply_enabled: ttsEnabled,
        tts_voice_type: ttsVoiceType,
        tts_voice: ttsVoice,
        tts_max_chars: ttsMaxChars,
      });
      setTtsEnabled(res.data.tts_reply_enabled === true);
      setTtsVoiceType(res.data.tts_voice_type === "clone" ? "clone" : "preset");
      setTtsVoice(res.data.tts_voice || "nova");
      setTtsMaxChars(res.data.tts_max_chars ?? 500);
      toast.success("Configurações de resposta em áudio salvas.");
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, "Não foi possível salvar as configurações de áudio."));
    } finally {
      setSavingTts(false);
    }
  };

  // Upload para Clonagem de Voz
  const uploadVoiceClone = async (file: File) => {
    setUploadingClone(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const part = result.includes(",") ? result.split(",")[1] : result;
          resolve(part);
        };
        reader.onerror = () => reject(new Error("Falha ao ler ficheiro"));
        reader.readAsDataURL(file);
      });

      await api.post("/api/settings/voice-clone", {
        audio_base64: base64,
        filename: file.name,
        mime_type: file.type || "audio/mpeg",
      });

      setHasClonedVoice(true);
      setTtsVoiceType("clone");
      toast.success("Voz clonada com sucesso. Ative as respostas em áudio e salve.");
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, "Não foi possível clonar a voz."));
    } finally {
      setUploadingClone(false);
    }
  };

  // Deletar Voz Clonada
  const removeVoiceClone = async () => {
    setUploadingClone(true);
    try {
      await api.delete("/api/settings/voice-clone");
      setHasClonedVoice(false);
      setTtsVoiceType("preset");
      toast.success("Voz clonada removida.");
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, "Não foi possível remover a voz clonada."));
    } finally {
      setUploadingClone(false);
    }
  };

  const handleCancel = () => {
    if (originalSettingsRef.current) {
      setCompanyName(originalSettingsRef.current.company_name || "");
      setNotificationEmail(originalSettingsRef.current.notification_email || "");
      setInteractionTime(originalSettingsRef.current.delay_seconds || 5);
      if (originalSettingsRef.current.workingHours) {
        setWorkingHours(originalSettingsRef.current.workingHours);
      }
    }
  };

  const handleToggleChatbot = async () => {
    try {
      if (!instanceName) {
        toast.error("Instância não encontrada");
        return;
      }
      const newStatus = !chatbotEnabled;
      await api.post("/api/evolution/toggle-chatbot", {
        instanceName,
        enabled: newStatus,
      });
      setChatbotEnabled(newStatus);
      setTimeout(() => void fetchLogs(), 800);
      toast.success(newStatus ? "Bot ativado com sucesso" : "Bot desativado com sucesso");
    } catch (error) {
      console.error("Erro ao alterar bot:", error);
      toast.error("Erro ao alterar o status do chatbot.");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen text-slate-100">
        
        {/* ================= HEADER ULTRA-MODERNO NEON ================= */}
        <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[#0B1120] p-8 shadow-[0_10px_50px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_top_left,_#06B6D4,_transparent_35%)]" />
            <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_bottom_right,_#3B82F6,_transparent_30%)]" />
          </div>
          <div className="absolute inset-[1px] rounded-[31px] border border-white/5 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-cyan-500 blur-xl opacity-20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-500/20 bg-[#111827]">
                  <Settings size={36} className="text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-sm font-semibold tracking-wide uppercase">Sistema Online</span>
                </div>
                <h1 className="mt-3 text-5xl font-black tracking-tight text-white">Painel de Configurações</h1>
                <p className="mt-3 text-slate-400 text-lg max-w-2xl leading-relaxed">
                  Gerencie seu chatbot, horários de funcionamento e automações inteligentes de voz em um ambiente moderno.
                </p>
              </div>
            </div>

            {/* CARD METRICAS TOP */}
            <div className="min-w-[260px] rounded-3xl border border-slate-800 bg-[#111827]/80 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Chatbot</p>
                  <h3 className="text-2xl font-black text-white mt-1">{chatbotEnabled ? "Ativado" : "Desativado"}</h3>
                </div>
                <div className={`h-4 w-4 rounded-full ${chatbotEnabled ? "bg-green-400 shadow-[0_0_20px_#4ade80]" : "bg-red-400 shadow-[0_0_20px_#f87171]"}`} />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <p className="text-slate-500 text-sm">Tempo</p>
                  <span className="text-white font-bold text-lg">{interactionTime}s</span>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Áudio (TTS)</p>
                  <span className={`text-sm font-bold ${ttsEnabled ? "text-cyan-400" : "text-slate-400"}`}>{ttsEnabled ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= NAVEGAÇÃO ENTRE TABS ================= */}
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { id: "general", label: "Geral", icon: <Building2 size={18} /> },
            { id: "automation", label: "Automação", icon: <Bot size={18} /> },
            { id: "audio", label: "Áudio (Voz)", icon: <Mic size={18} /> },
            { id: "logs", label: "Logs", icon: <History size={18} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-cyan-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
            <Loader2 className="animate-spin text-cyan-400" size={28} />
            Carregando configurações...
          </div>
        ) : (
          <>
            {/* ================= TAB GERAL ================= */}
            {activeTab === "general" && (
              <div className="mt-8 space-y-6">
                <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                      <Building2 size={26} className="text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">Informações Gerais</h2>
                      <p className="text-slate-400 text-sm">Configure os dados principais da empresa.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nome da Empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    <Input label="E-mail de Notificação" type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} />
                  </div>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                  <Button variant="primary" className="gap-2 px-6" onClick={handleSaveSettings}>
                    <Save size={18} /> Salvar Alterações
                  </Button>
                </div>
              </div>
            )}

            {/* ================= TAB AUTOMAÇÃO ================= */}
            {activeTab === "automation" && (
              <div className="mt-8 space-y-8">
                <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white">Status do Chatbot</h2>
                      <p className="text-slate-400 mt-2">Ative ou desative o chatbot global nas instâncias configuradas.</p>
                    </div>
                    <button
                      onClick={handleToggleChatbot}
                      className={`w-20 h-10 rounded-full relative transition-all duration-300 ${chatbotEnabled ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-slate-700"}`}
                    >
                      <div className={`w-8 h-8 bg-white rounded-full absolute top-1 transition-all duration-300 ${chatbotEnabled ? "right-1" : "left-1"}`} />
                    </button>
                  </div>
                </Card>

                <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Clock3 size={24} className="text-cyan-400" />
                    <div>
                      <h2 className="text-2xl font-black text-white">Tempo de Interação</h2>
                      <p className="text-slate-400 text-sm">Tempo de atraso (em segundos) antes do bot formular e enviar a resposta.</p>
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
                    <h2 className="text-2xl font-black text-white">Horário de Atendimento</h2>
                    <p className="text-slate-400 mt-2">Defina as janelas de horário em que o assistente responderá de forma ativa.</p>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-8">
                    {weekDays.map((day) => {
                      const dayData = workingHours[day.key] || { closed: true };
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleToggleDay(day.key)}
                          className={`px-6 py-4 rounded-2xl border transition-all duration-300 ${!dayData.closed ? "bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10" : "bg-slate-900 border-slate-700 text-slate-500"}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{day.label}</span>
                            <span className="text-xs mt-1">{dayData.closed ? "Fechado" : "Ativo"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-5">
                    {weekDays.map((day) => {
                      const dayData = workingHours[day.key];
                      if (!dayData || dayData.closed) return null;

                      return (
                        <div key={day.key} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                            <div>
                              <p className="text-cyan-400 font-black text-lg">{day.label}</p>
                              <p className="text-slate-500 text-sm">Janela de atividade</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <input
                                type="time"
                                value={dayData.open}
                                onChange={(e) => handleHourChange(day.key, "open", e.target.value)}
                                className="border border-slate-700 rounded-2xl px-5 py-4 bg-[#0F172A] text-white"
                              />
                              <span className="text-slate-500 font-bold">até</span>
                              <input
                                type="time"
                                value={dayData.close}
                                onChange={(e) => handleHourChange(day.key, "close", e.target.value)}
                                className="border border-slate-700 rounded-2xl px-5 py-4 bg-[#0F172A] text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                  <Button variant="primary" className="gap-2 px-6" onClick={handleSaveSettings}>
                    <Save size={18} /> Salvar Alterações
                  </Button>
                </div>
              </div>
            )}

            {/* ================= TAB ÁUDIO (TTS) ================= */}
            {activeTab === "audio" && (
              <div className="mt-8 space-y-6">
                <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                      <Mic size={26} className="text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">Respostas em Áudio</h2>
                      <p className="text-slate-400 text-sm">Configurações de síntese vocal e clonagem por IA.</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    Voz usada nos fluxos com ações <strong>Enviar áudio</strong> ou <strong>Responder em áudio</strong>. 
                    Utilize vozes prontas ou execute a <strong>clonagem de voz avançada</strong> via Mistral Voxtral.
                  </p>

                  {!mistralConfigured && (
                    <div className="text-xs text-amber-400 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      Para clonar a sua própria voz, certifique-se de configurar a chave <code className="text-cyan-400">MISTRAL_API_KEY</code> no servidor (.env).
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer select-none border border-slate-800 bg-slate-900/50 p-4 rounded-2xl hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                      checked={ttsEnabled}
                      disabled={savingTts}
                      onChange={(e) => setTtsEnabled(e.target.checked)}
                    />
                    <span className="text-sm font-semibold text-white">Activar respostas em áudio</span>
                  </label>

                  {ttsEnabled && (
                    <div className="space-y-6 pl-4 border-l-2 border-cyan-500/30">
                      <div>
                        <span className="block text-sm font-semibold text-slate-300 mb-3">Tipo de Motor de Voz</span>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                            <input
                              type="radio"
                              name="ttsVoiceType"
                              className="text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                              checked={ttsVoiceType === "preset"}
                              disabled={savingTts || uploadingClone}
                              onChange={() => setTtsVoiceType("preset")}
                            />
                            Voz padrão de fábrica (Preset)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                            <input
                              type="radio"
                              name="ttsVoiceType"
                              className="text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                              checked={ttsVoiceType === "clone"}
                              disabled={savingTts || uploadingClone || !hasClonedVoice}
                              onChange={() => setTtsVoiceType("clone")}
                            />
                            Voz customizada clonada por IA
                          </label>
                        </div>
                      </div>

                      {/* CLONAGEM DE VOZ */}
                      <div className="rounded-2xl border border-slate-800 p-5 space-y-4 bg-slate-900/30">
                        <p className="text-md font-bold text-white">Clonar a sua voz por Inteligência Artificial</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Envie um arquivo de 10 a 20 segundos de áudio limpo, com voz firme e sem ruídos ou música de fundo. 
                          Formatos aceitos: MP3, WAV, OGG ou WebM.
                        </p>
                        
                        {hasClonedVoice && (
                          <div className="flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 rounded-xl">
                            <span className="text-sm text-emerald-400 font-medium">Biometria de voz clonada ativa</span>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 text-xs"
                              disabled={uploadingClone}
                              onClick={() => void removeVoiceClone()}
                            >
                              Remover Clone
                            </Button>
                          </div>
                        )}

                        <label className="inline-flex">
                          <input
                            type="file"
                            accept="audio/*"
                            className="sr-only"
                            disabled={uploadingClone || !mistralConfigured}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadVoiceClone(file);
                              e.target.value = "";
                            }}
                          />
                          <span className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition cursor-pointer ${mistralConfigured ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10" : "border-slate-800 text-slate-500 cursor-not-allowed"}`}>
                            {uploadingClone ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
                            {hasClonedVoice ? "Substituir amostra de voz" : "Enviar nova amostra de voz"}
                          </span>
                        </label>
                      </div>

                      {/* VOZES PRESET */}
                      {ttsVoiceType === "preset" && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-300">Vozes prontas de estúdio</label>
                          <select
                            className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition"
                            value={ttsVoice}
                            disabled={savingTts}
                            onChange={(e) => setTtsVoice(e.target.value)}
                          >
                            {TTS_VOICES.map((v) => (
                              <option key={v.id} value={v.id} className="bg-slate-950">{v.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* CARACTERES MÁXIMOS */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Limite de texto para conversão em áudio</label>
                        <input
                          type="number"
                          min={80}
                          max={2000}
                          className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition"
                          value={ttsMaxChars}
                          disabled={savingTts}
                          onChange={(e) => setTtsMaxChars(Number(e.target.value) || 500)}
                        />
                        <p className="text-xs text-slate-500">
                          Respostas textuais longas são truncadas na síntese vocal por economia de processamento (o histórico completo de chat é preservado).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-800">
                    <Button
                      type="button"
                      disabled={savingTts || loading}
                      onClick={() => void saveTtsReply()}
                      className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-xl"
                    >
                      {savingTts ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Salvar Configurações de Áudio
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ================= TAB LOGS ================= */}
            {activeTab === "logs" && (
              <div className="mt-8">
                <Card className="bg-[#111827] border border-slate-800 rounded-[30px] shadow-2xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white">Logs do Sistema</h2>
                      <p className="text-slate-400 mt-2">Monitoramento em tempo real dos eventos críticos da automação.</p>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 font-medium">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      Conexão Ativa
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {logs.length > 0 ? (
                      logs.map((log: any) => {
                        const levelStyles = {
                          SUCCESS: "border-green-500/20 bg-green-500/5 text-green-400",
                          ERROR: "border-red-500/20 bg-red-500/5 text-red-400",
                          WARN: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
                          INFO: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
                        };

                        return (
                          <div
                            key={log.id}
                            className={`rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.005] ${levelStyles[log.level as keyof typeof levelStyles] || "border-slate-800 bg-slate-900 text-slate-300"}`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-black uppercase tracking-wider">{log.level}</span>
                              <span className="opacity-40">•</span>
                              <span className="text-xs opacity-70">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <p className="text-sm font-medium">{log.description}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-16 text-slate-500">
                        <History size={50} className="mx-auto mb-4 opacity-30" />
                        <p>Nenhum log operacional registrado.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;