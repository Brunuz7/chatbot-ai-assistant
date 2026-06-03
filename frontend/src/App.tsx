import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Automations from './pages/Automations';
import FlowEditor from './pages/FlowEditor';
import KnowledgeBase from './pages/KnowledgeBase';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import LeadTags from './pages/LeadTags';
import BulkMessages from './pages/BulkMessages';
import Instructions from './pages/Instructions';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import Agents from './pages/Agents';
import TermsAndPolicies from './pages/TermsAndPolicies';

function LegacyFlowEditRedirect() {
  const { flowId } = useParams<{ flowId: string }>();
  if (!flowId) return <Navigate to="/fluxos" replace />;
  return <Navigate to={`/fluxos/${flowId}/editar`} replace />;
}

function App() {
  return (
    <>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
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
            <Route path="/fluxos" element={<Automations />} />
            <Route path="/fluxos/novo" element={<FlowEditor />} />
            <Route path="/fluxos/:flowId/editar" element={<FlowEditor />} />
            <Route path="/agentes" element={<Agents />} />
            <Route path="/base-conhecimento" element={<KnowledgeBase />} />
            <Route path="/contatos" element={<Contacts />} />
            <Route path="/instrucoes" element={<Instructions />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/classificacao-contatos" element={<LeadTags />} />
            <Route path="/envio-em-massa" element={<BulkMessages />} />
          </Route>

          <Route path="/login" element={<Navigate to="/entrar" replace />} />
          <Route path="/register" element={<Navigate to="/cadastro" replace />} />
          <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
          <Route path="/automations" element={<Navigate to="/fluxos" replace />} />
          <Route path="/automations/new" element={<Navigate to="/fluxos/novo" replace />} />
          <Route path="/automations/:flowId/edit" element={<LegacyFlowEditRedirect />} />
          <Route path="/agents" element={<Navigate to="/agentes" replace />} />
          <Route path="/knowledge" element={<Navigate to="/base-conhecimento" replace />} />
          <Route path="/contacts" element={<Navigate to="/contatos" replace />} />
          <Route path="/conversations" element={<Navigate to="/contatos" replace />} />
          <Route path="/instructions" element={<Navigate to="/instrucoes" replace />} />
          <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
          <Route path="/lead-tags" element={<Navigate to="/classificacao-contatos" replace />} />
          <Route path="/bulk-messages" element={<Navigate to="/envio-em-massa" replace />} />

          <Route path="*" element={<Navigate to="/entrar" replace />} />
        </Routes>
      </Router>
      <Toaster theme="system" richColors position="top-right" closeButton />
    </>
  );
}

export default App;
