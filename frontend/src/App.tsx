import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Automations from './pages/Automations';
import KnowledgeBase from './pages/KnowledgeBase';
import Integrations from './pages/Integrations';
import Contacts from './pages/Contacts';
import Metrics from './pages/Metrics';
import AIConfig from './pages/AIConfig';
import Settings from './pages/Settings';
import Instructions from './pages/Instructions';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import BlockedContacts from './pages/BlockedContacts';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Public auth pages (redirect to dashboard when already authenticated) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Authenticated app pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/ai-config" element={<AIConfig />} />
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/blocked" element={<BlockedContacts />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

