import { SupportContactLink } from '../components/SupportContactLink';
import { LegalEmailLink } from '../components/legal/LegalEmailLink';
import { LegalDocumentLayout } from '../components/legal/LegalDocumentLayout';
import { usePageMeta } from '../hooks/usePageMeta';
import { COMPANY_CNPJ, COMPANY_EMAIL } from '../constants/contact';

const PRODUCT_NAME = 'Assistente Prestei';
const BRAND = 'Prestei';
const LAST_UPDATED = '27 de maio de 2026';
const RESPONSE_DAYS = 30;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

export default function TermsAndPolicies() {
  usePageMeta({
    title: `Termos de Uso e Política de Privacidade — ${PRODUCT_NAME}`,
    description: `Termos de uso e política de privacidade do ${PRODUCT_NAME}.`,
    canonicalUrl: 'https://app.prestei.com/termos-e-politicas',
  });

  return (
    <LegalDocumentLayout
      title="Termos de Uso e Política de Privacidade"
      lastUpdated={LAST_UPDATED}
      footer={
        <p>
          © {new Date().getFullYear()} {PRODUCT_NAME} · {BRAND} · CNPJ {COMPANY_CNPJ} ·{' '}
          <a href="https://gnerisdev.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
            gnerisdev.com
          </a>
        </p>
      }
    >
      <nav className="not-prose mb-10 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
        <p className="font-semibold text-slate-900 dark:text-white mb-2">Índice</p>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
          Termos de uso
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 mb-4">
          <li><a href="#termos" className="hover:text-primary">Termos de Uso</a></li>
          <li><a href="#termos-aceitacao" className="hover:text-primary">Aceitação</a></li>
          <li><a href="#termos-servico" className="hover:text-primary">O Serviço</a></li>
          <li><a href="#termos-conta" className="hover:text-primary">Conta e responsabilidades</a></li>
          <li><a href="#termos-uso" className="hover:text-primary">Uso permitido</a></li>
          <li><a href="#termos-meta" className="hover:text-primary">WhatsApp e Meta</a></li>
          <li><a href="#termos-limitacao" className="hover:text-primary">Limitação de responsabilidade</a></li>
        </ol>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
          Política de privacidade
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
          <li><a href="#privacidade" className="hover:text-primary">Política de Privacidade</a></li>
          <li><a href="#dados-coletados" className="hover:text-primary">Dados coletados</a></li>
          <li><a href="#bases-legais" className="hover:text-primary">Bases legais (LGPD)</a></li>
          <li><a href="#direitos" className="hover:text-primary">Direitos e exclusão</a></li>
          <li><a href="#contato" className="hover:text-primary">Contato</a></li>
        </ol>
      </nav>

      <p>
        Esta página reúne os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> do{' '}
        <strong>{PRODUCT_NAME}</strong> (&quot;Serviço&quot;), plataforma SaaS de assistente inteligente para
        WhatsApp com integração à API oficial da Meta.
      </p>
      <p>
        O Serviço é operado sob responsabilidade da marca <strong>{BRAND}</strong>, pessoa jurídica inscrita
        no CNPJ <strong>{COMPANY_CNPJ}</strong>.
      </p>
      <p>
        <strong>URL pública oficial:</strong>{' '}
        <a
          href="https://app.prestei.com/termos-e-politicas"
          className="text-primary font-medium hover:underline break-all"
        >
          https://app.prestei.com/termos-e-politicas
        </a>
      </p>

      <h2
        id="termos"
        className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6 pt-4 scroll-mt-24"
      >
        Termos de Uso
      </h2>

      <Section id="termos-aceitacao" title="1. Aceitação">
        <p>
          Ao criar conta, acessar o painel ou utilizar o <strong>{PRODUCT_NAME}</strong>, você concorda com
          estes Termos de Uso e com a Política de Privacidade abaixo. Se não concordar, não utilize o
          Serviço. O Serviço é prestado sob responsabilidade da pessoa jurídica inscrita no CNPJ{' '}
          <strong>{COMPANY_CNPJ}</strong>.
        </p>
      </Section>

      <Section id="termos-servico" title="2. O Serviço">
        <p>
          O Serviço permite configurar assistentes conversacionais com IA para WhatsApp, incluindo fluxos,
          agentes, base de conhecimento, classificação de contatos e envio de mensagem programada, mediante conexão à API
          oficial do WhatsApp (Meta). O Serviço é uma ferramenta de automação; não substitui aconselhamento
          jurídico, médico ou financeiro, nem garante resultados comerciais específicos.
        </p>
      </Section>

      <Section id="termos-conta" title="3. Conta e responsabilidades">
        <p>
          Você deve fornecer informações verdadeiras no cadastro (nome, empresa, segmento, telefone, e-mail)
          e manter a confidencialidade da sua senha. É responsável por toda atividade na sua conta e pela
          configuração dos assistentes, mensagens enviadas e tratamento de dados dos seus contatos finais no
          WhatsApp.
        </p>
      </Section>

      <Section id="termos-uso" title="4. Uso permitido">
        <p>É proibido utilizar o Serviço para:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Spam, mensagens não solicitadas ou violação das políticas do WhatsApp / Meta;</li>
          <li>Conteúdo ilegal, difamatório, fraudulento ou que viole direitos de terceiros;</li>
          <li>Tentativas de comprometer a segurança do Serviço ou de outros utilizadores;</li>
          <li>Revenda não autorizada ou engenharia reversa do software.</li>
        </ul>
        <p>
          Podemos suspender ou encerrar contas que violem estes termos ou as políticas da Meta, sem prejuízo
          de outras medidas.
        </p>
      </Section>

      <Section id="termos-meta" title="5. WhatsApp e Meta">
        <p>
          A utilização do WhatsApp através do Serviço está sujeita aos termos e políticas da Meta, incluindo
          as políticas comerciais e de mensagens do WhatsApp Business. Você é responsável por obter as
          autorizações necessárias, cumprir opt-in dos destinatários e usar apenas números e contas para os
          quais tem legitimidade.
        </p>
        <p>
          O cliente é responsável por garantir que possui <strong>consentimento adequado (opt-in)</strong>{' '}
          antes do envio de mensagens via WhatsApp, conforme exigido pelas políticas da Meta e legislação
          aplicável. Mensagens promocionais, notificações ou contatos iniciados pelo negócio devem respeitar
          as regras de opt-in e opt-out aplicáveis.
        </p>
      </Section>

      <Section id="termos-limitacao" title="6. Limitação de responsabilidade">
        <p>
          O Serviço é fornecido &quot;como está&quot;. Na máxima extensão permitida pela legislação aplicável,
          não nos responsabilizamos por indisponibilidade de terceiros (Meta, provedores de infraestrutura),
          erros de conteúdo gerado por IA ou danos indiretos decorrentes do uso do Serviço. A nossa
          responsabilidade total, quando aplicável, limita-se ao valor pago pelo Serviço nos últimos 12
          meses, salvo disposição legal em contrário.
        </p>
      </Section>

      <Section id="termos-gerais" title="7. Disposições gerais">
        <p>
          Estes Termos de Uso poderão ser atualizados a qualquer momento. A versão vigente será publicada em{' '}
          <a
            href="https://app.prestei.com/termos-e-politicas"
            className="text-primary hover:underline break-all"
          >
            https://app.prestei.com/termos-e-politicas
          </a>
          . O uso continuado do Serviço após a publicação de alterações implica aceitação das condições então
          em vigor. Para dúvidas, escreva para <LegalEmailLink email={COMPANY_EMAIL} /> ou <SupportContactLink />.
        </p>
      </Section>

      <h2
        id="privacidade"
        className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6 pt-4 border-t border-slate-200 dark:border-slate-800 scroll-mt-24"
      >
        Política de Privacidade
      </h2>

      <p>
        Descrevemos como tratamos dados pessoais em conformidade com as expectativas da Meta e legislações
        vigentes (como a LGPD).
      </p>

      <Section id="controlador" title="1. Quem somos (controlador)">
        <p>
          O controlador dos dados é o responsável legal pela operação do <strong>{PRODUCT_NAME}</strong>{' '}
          pessoa jurídica inscrita no CNPJ <strong>{COMPANY_CNPJ}</strong>.
          O Serviço é destinado a empresas e profissionais que configuram assistentes para atender
          contatos no WhatsApp.
        </p>
      </Section>

      <Section id="dados-coletados" title="2. Quais informações coletamos">
        <p>Coletamos dados fornecidos por você, gerados pelo uso do Serviço e recebidos de terceiros:</p>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white pt-2">2.1 Conta no painel</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Nome, empresa, segmento, telefone, e-mail e senha (armazenada como hash).</li>
          <li>Identificadores internos, tokens de autenticação e mecanismos seguros de sessão.</li>
        </ul>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white pt-2">2.2 WhatsApp e Meta</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Dados do Embedded Signup: OAuth, WABA, ID do número, nome verificado e token da Cloud API.
          </li>
          <li>Telefone de exibição e nome verificado no painel.</li>
        </ul>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white pt-2">2.3 Contatos e conversas</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Telefone, JID, nome, tags, mensagens, áudio, histórico e metadados.</li>
          <li>Estado de bloqueio e contexto de fluxo ativo.</li>
        </ul>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white pt-2">2.4 Configuração e técnico</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Agentes, fluxos, instruções, base de conhecimento, mensagens programadas.</li>
          <li>Logs, IP, navegador e payloads de webhook temporários.</li>
        </ul>
      </Section>

      <Section id="finalidades" title="3. Finalidades">
        <ul className="list-disc pl-6 space-y-2">
          <li>Prestação do Serviço e autenticação;</li>
          <li>Automação, IA, transcrição e síntese de voz;</li>
          <li>Segurança, suporte e cumprimento legal.</li>
        </ul>
      </Section>

      <Section id="bases-legais" title="4. Bases legais (LGPD)">
        <p>Tratamos dados pessoais com fundamento nas hipóteses da LGPD, conforme o caso:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Execução de contrato</strong> e procedimentos preliminares: criação de conta, operação do
            painel, integração com WhatsApp e prestação do Serviço contratado.
          </li>
          <li>
            <strong>Legítimo interesse</strong>: segurança da plataforma, prevenção de fraude e abuso,
            melhoria do Serviço e suporte, respeitados seus direitos e expectativas.
          </li>
          <li>
            <strong>Consentimento</strong>: quando exigido para finalidades específicas (por exemplo,
            comunicações opcionais ou integrações facultativas), com possibilidade de revogação.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal ou regulatória</strong>: quando aplicável.
          </li>
        </ul>
        <p>
          Para contatos finais no WhatsApp, o cliente (utilizador do Serviço) é responsável por definir e
          documentar a base legal aplicável perante seus próprios destinatários.
        </p>
      </Section>

      <Section id="terceiros" title="5. Partilha com terceiros">
        <p>
          Não vendemos dados pessoais. Partilhamos com a Meta (WhatsApp), provedores de IA e infraestrutura em
          nuvem necessários para operação do serviço, sempre na medida necessária à prestação contratada.
        </p>
      </Section>

      <Section id="cookies" title="6. Cookies e sessão">
        <p>
          Utilizamos cookies e mecanismos seguros de sessão para autenticação no painel. No fluxo de Embedded
          Signup da Meta, cookies da Meta podem ser utilizados conforme as políticas da plataforma.
        </p>
      </Section>

      <Section id="retencao" title="7. Retenção">
        <p>
          Dados mantidos enquanto a conta estiver ativa; conversas inativas podem ser removidas conforme regras do
          produto; tokens da Meta até desconexão ou pedido de exclusão.
        </p>
      </Section>

      <Section id="direitos" title="8. Seus direitos e exclusão de dados">
        <p>Você pode solicitar, entre outros direitos previstos na LGPD:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Exclusão</strong> dos dados associados à sua conta;</li>
          <li><strong>Correção</strong> de dados inexatos ou desatualizados;</li>
          <li><strong>Exportação</strong> (portabilidade) dos dados fornecidos, quando aplicável;</li>
          <li><strong>Acesso</strong> e informações sobre o tratamento.</li>
        </ul>
        <p>
          <strong>Como solicitar:</strong> envie e-mail para <LegalEmailLink email={COMPANY_EMAIL} /> com o
          assunto &quot;Exclusão de dados — {PRODUCT_NAME}&quot; (ou indique correção/exportação), incluindo
          nome completo, e-mail da conta e descrição do pedido.
        </p>
        <p>
          <strong>Prazo:</strong> em geral até <strong>{RESPONSE_DAYS} dias</strong> após confirmação da
          identidade, salvo prazo legal distinto.
        </p>
      </Section>

      <Section id="seguranca" title="9. Segurança">
        <p>HTTPS, hash de senhas, mecanismos seguros de sessão e segregação de dados por conta.</p>
      </Section>

      <Section id="alteracoes-privacidade" title="10. Alterações">
        <p>
          Alterações materiais serão publicadas em{' '}
          <a
            href="https://app.prestei.com/termos-e-politicas"
            className="text-primary hover:underline break-all"
          >
            https://app.prestei.com/termos-e-politicas
          </a>
          .
        </p>
      </Section>

      <Section id="contato" title="11. Contato">
        <p>
          E-mail: <LegalEmailLink email={COMPANY_EMAIL} /> · <SupportContactLink />
        </p>
      </Section>
    </LegalDocumentLayout>
  );
}
