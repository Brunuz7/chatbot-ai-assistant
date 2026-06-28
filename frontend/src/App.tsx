import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LegacyFlowEditRedirect from './components/routing/LegacyFlowEditRedirect';
import { AppToaster } from './components/theme/AppToaster';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Automations from './pages/Automations';
import FlowEditor from './pages/FlowEditor';
import KnowledgeBase from './pages/KnowledgeBase';
import IntegratedStore from './pages/IntegratedStore';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import TagsPage from './pages/Tags';
import BulkMessages from './pages/BulkMessages';
import MessageTemplates from './pages/MessageTemplates';
import MessageTemplateCreate from './pages/MessageTemplateCreate';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import Agents from './pages/Agents';
import TermsAndPolicies from './pages/TermsAndPolicies';

function App() {
  return (
    <>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/termos-e-politicas" element={<TermsAndPolicies />} />
          <Route path="/politica-de-privacidade" element={<Navigate to="/termos-e-politicas" replace />} />
          <Route path="/privacy-policy" element={<Navigate to="/termos-e-politicas" replace />} />

          <Route element={<PublicRoute />}>
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/inicio" element={<Dashboard />} />
            <Route path="/relatorios" element={<Navigate to="/inicio" replace />} />
            <Route path="/fluxos" element={<Automations />} />
            <Route path="/fluxos/novo" element={<FlowEditor />} />
            <Route path="/fluxos/:flowId/editar" element={<FlowEditor />} />
            <Route path="/agentes" element={<Agents />} />
            <Route path="/base-conhecimento" element={<KnowledgeBase />} />
            <Route path="/loja-integrada" element={<IntegratedStore />} />
            <Route path="/contatos" element={<Contacts />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/classificacao-contatos" element={<TagsPage />} />
            <Route path="/campanhas" element={<BulkMessages />} />
            <Route path="/campanhas/templates" element={<MessageTemplates />} />
            <Route path="/campanhas/templates/novo" element={<MessageTemplateCreate />} />
          </Route>

          <Route path="/login" element={<Navigate to="/entrar" replace />} />
          <Route path="/register" element={<Navigate to="/cadastro" replace />} />
          <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
          <Route path="/automations" element={<Navigate to="/fluxos" replace />} />
          <Route path="/automations/new" element={<Navigate to="/fluxos/novo" replace />} />
          <Route path="/automations/:flowId/edit" element={<LegacyFlowEditRedirect />} />
          <Route path="/agents" element={<Navigate to="/agentes" replace />} />
          <Route path="/knowledge" element={<Navigate to="/base-conhecimento" replace />} />
          <Route
            path="/base-conhecimento/loja"
            element={<Navigate to="/loja-integrada" replace />}
          />
          <Route path="/store" element={<Navigate to="/loja-integrada" replace />} />
          <Route path="/contacts" element={<Navigate to="/contatos" replace />} />
          <Route path="/conversations" element={<Navigate to="/contatos" replace />} />
          <Route path="/instrucoes" element={<Navigate to="/configuracoes?tab=instructions" replace />} />
          <Route path="/instructions" element={<Navigate to="/configuracoes?tab=instructions" replace />} />
          <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
          <Route path="/lead-tags" element={<Navigate to="/classificacao-contatos" replace />} />
          <Route path="/envio-em-massa" element={<Navigate to="/campanhas" replace />} />
          <Route path="/envio-em-massa/templates" element={<Navigate to="/campanhas/templates" replace />} />
          <Route path="/envio-em-massa/templates/novo" element={<Navigate to="/campanhas/templates/novo" replace />} />
          <Route path="/bulk-messages" element={<Navigate to="/campanhas" replace />} />
          <Route path="/bulk-messages/templates" element={<Navigate to="/campanhas/templates" replace />} />
          <Route path="/bulk-messages/templates/new" element={<Navigate to="/campanhas/templates/novo" replace />} />

          <Route path="*" element={<Navigate to="/entrar" replace />} />
        </Routes>
      </Router>
      <AppToaster />
    </>
  );
}

export default App;
