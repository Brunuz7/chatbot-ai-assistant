import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Automations from './pages/Automations';
import KnowledgeBase from './pages/KnowledgeBase';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import Instructions from './pages/Instructions';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import Agents from './pages/Agents';
function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
      >
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
          <Route path="/agents" element={<Agents />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

