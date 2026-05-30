import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

import {
  FileText,
  Save,
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Power,
  Wand2,
} from "lucide-react";

export default function Instructions() {
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );

  /*
  =========================
  LOAD INSTRUCTION
  =========================
  */
  useEffect(() => {
    async function loadInstruction() {
      try {
        setLoading(true);

        const response = await api.get("/api/instructions");

        if (response.data) {
          setContent(response.data.content || "");
          setIsActive(Boolean(response.data.is_active));
        }
      } catch (error) {
        console.error("Erro ao carregar instrução:", error);

        setMessageType("error");
        setMessage("Falha ao carregar instruções.");
      } finally {
        setLoading(false);
      }
    }

    loadInstruction();
  }, []);

  /*
  =========================
  SAVE
  =========================
  */
  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      await api.put("/api/instructions", {
        content,
        is_active: isActive,
      });

      setMessageType("success");
      setMessage("Instrução salva com sucesso.");
    } catch (error: any) {
      console.error(error);

      const backendError = error?.response?.data?.error;

      setMessageType("error");

      if (backendError === "invalid_input") {
        setMessage("Preencha a instrução antes de salvar.");
      } else {
        setMessage("Falha ao salvar instrução.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* ========================================= */}
        {/* HERO */}
        {/* ========================================= */}

        <header
          className="
            relative overflow-hidden
            rounded-[32px]
            border border-white/10
            bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#020617]
            p-8
            shadow-[0_0_80px_rgba(59,130,246,0.08)]
          "
        >
          {/* GLOW */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* LEFT */}
            <div className="flex items-start gap-5">
              <div
                className="
                  w-20 h-20 rounded-3xl
                  bg-cyan-500/10
                  border border-cyan-400/20
                  flex items-center justify-center
                  shadow-lg shadow-cyan-500/10
                "
              >
                <BrainCircuit size={34} className="text-cyan-400" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

                  <span className="text-cyan-300 text-xs font-bold uppercase tracking-[0.2em]">
                    IA GLOBAL
                  </span>
                </div>

                <h1 className="text-5xl font-black tracking-tight text-white">
                  Painel de Instruções
                </h1>

                <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                  Configure regras globais para controlar o comportamento,
                  personalidade e respostas da inteligência artificial.
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* STATUS */}
              <div
                className={`
                  min-w-[220px]
                  rounded-3xl
                  border
                  backdrop-blur-xl
                  p-5
                  ${
                    isActive
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Status da IA</p>

                    <h2 className="text-3xl font-black text-white mt-2">
                      {isActive ? "Ativa" : "Desativada"}
                    </h2>
                  </div>

                  <div
                    className={`
                      w-14 h-14 rounded-2xl
                      border flex items-center justify-center
                      ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-red-500/10 border-red-500/20"
                      }
                    `}
                  >
                    <Power
                      size={24}
                      className={isActive ? "text-emerald-400" : "text-red-400"}
                    />
                  </div>
                </div>

                <div
                  className={`
                    mt-4 flex items-center gap-2 text-sm font-medium
                    ${isActive ? "text-emerald-400" : "text-red-400"}
                  `}
                >
                  <div
                    className={`
                      w-2 h-2 rounded-full animate-pulse
                      ${isActive ? "bg-emerald-400" : "bg-red-400"}
                    `}
                  />

                  {isActive
                    ? "Instruções sendo aplicadas"
                    : "Instruções desativadas"}
                </div>
              </div>

              {/* TOKENS / SIZE */}
              <div
                className="
                  min-w-[220px]
                  rounded-3xl
                  border border-cyan-500/20
                  bg-cyan-500/5
                  backdrop-blur-xl
                  p-5
                "
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Caracteres</p>

                    <h2 className="text-3xl font-black text-white mt-2">
                      {content.length}
                    </h2>
                  </div>

                  <div
                    className="
                      w-14 h-14 rounded-2xl
                      bg-cyan-500/10
                      border border-cyan-500/20
                      flex items-center justify-center
                    "
                  >
                    <Sparkles size={24} className="text-cyan-400" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium">
                  <ShieldCheck size={14} />
                  Contexto global da IA
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================= */}
        {/* MAIN CARD */}
        {/* ========================================= */}

        <div
          className="
            relative overflow-hidden
            rounded-[28px]
            border border-white/10
            bg-[#0B1120]
            p-6
            shadow-2xl
          "
        >
          {/* BG EFFECT */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-3xl rounded-full" />

          <div className="relative z-10 space-y-6">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-12 h-12 rounded-2xl
                      bg-cyan-500/10
                      border border-cyan-500/20
                      flex items-center justify-center
                    "
                  >
                    <FileText size={22} className="text-cyan-400" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Instrução Global
                    </h2>

                    <p className="text-slate-400 text-sm mt-1">
                      Defina como a IA deve responder em todos os atendimentos.
                    </p>
                  </div>
                </div>
              </div>

              {/* TOGGLE */}
              <label
                className={`
                  relative flex items-center justify-between
                  min-w-[260px]
                  rounded-2xl
                  border
                  px-5 py-4
                  cursor-pointer
                  transition-all
                  ${
                    isActive
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }
                `}
              >
                <div>
                  <p className="text-white font-semibold">Ativar instrução</p>

                  <span className="text-sm text-slate-400">
                    Aplicar contexto global automaticamente
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />

                  <div
                    className={`
                      w-14 h-8 rounded-full transition-all
                      ${isActive ? "bg-emerald-500" : "bg-slate-700"}
                    `}
                  />

                  <div
                    className={`
                      absolute top-1 w-6 h-6 rounded-full bg-white transition-all
                      ${isActive ? "left-7" : "left-1"}
                    `}
                  />
                </div>
              </label>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4" />

                <p className="text-lg font-medium">Carregando instruções...</p>
              </div>
            ) : (
              <>
                {/* TEXTAREA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-300">
                      Contexto da IA
                    </label>

                    <div className="text-xs text-slate-500">
                      {content.length} caracteres
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={12}
                      placeholder="Ex: Você é um assistente profissional, responda sempre de forma objetiva, educada e sem utilizar gírias..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="
                        w-full
                        rounded-2xl
                        border border-white/10
                        bg-white/5
                        backdrop-blur-xl
                        px-5 py-5
                        text-white
                        placeholder:text-slate-500
                        resize-none
                        outline-none
                        transition-all
                        focus:border-cyan-400/40
                        focus:ring-4
                        focus:ring-cyan-500/10
                      "
                    />

                    <div className="absolute bottom-4 right-4 opacity-20">
                      <Wand2 size={28} className="text-cyan-400" />
                    </div>
                  </div>
                </div>

                {/* ALERT */}
                <div
                  className="
                    rounded-2xl
                    border border-amber-500/20
                    bg-amber-500/5
                    p-4
                    flex items-start gap-3
                  "
                >
                  <AlertCircle size={20} className="text-amber-400 mt-0.5" />

                  <div>
                    <h3 className="text-amber-300 font-semibold">Importante</h3>

                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      Essas instruções serão utilizadas em todas as mensagens
                      geradas pela IA. Evite regras conflitantes ou instruções
                      extremamente longas.
                    </p>
                  </div>
                </div>

                {/* MESSAGE */}
                {message && (
                  <div
                    className={`
                      rounded-2xl border px-4 py-4 flex items-center gap-3
                      ${
                        messageType === "success"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                          : "border-red-500/20 bg-red-500/5 text-red-300"
                      }
                    `}
                  >
                    {messageType === "success" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}

                    <span className="font-medium">{message}</span>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="
                      inline-flex items-center gap-3
                      rounded-2xl
                      bg-cyan-500
                      hover:bg-cyan-400
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      px-6 py-4
                      text-black
                      font-bold
                      transition-all
                      shadow-lg shadow-cyan-500/20
                    "
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar Instrução
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
