import { WhatsAppBrandIcon } from '../dashboard/WhatsAppBrandIcon';

export function LandingChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary-a20 via-transparent to-emerald-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <WhatsAppBrandIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Atendimento Prestei</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">online agora</p>
          </div>
        </div>

        <div className="space-y-4 bg-[#e5ddd5] px-4 py-6 dark:bg-slate-950/60">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
            Olá! Gostaria de saber o horário de atendimento.
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-50">
            Funcionamos de segunda a sexta, das 8h às 18h. Posso ajudar com mais alguma informação?
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
            Sim, quais produtos vocês oferecem?
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-50">
            Temos três planos disponíveis. Posso enviar os detalhes agora mesmo.
          </div>
        </div>
      </div>
    </div>
  );
}
