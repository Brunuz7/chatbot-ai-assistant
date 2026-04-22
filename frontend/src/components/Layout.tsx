import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  BookOpen, 
  Share2, 
  Users, 
  BarChart3, 
  Bot, 
  Settings,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/Button';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
      active 
        ? 'bg-primary/10 text-primary' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/automations', icon: <Zap size={20} />, label: 'Fluxos' },
    { to: '/knowledge', icon: <BookOpen size={20} />, label: 'Base de Conhecimento' },
    { to: '/integrations', icon: <Share2 size={20} />, label: 'Integrações' },
    { to: '/contacts', icon: <Users size={20} />, label: 'Contatos' },
    { to: '/metrics', icon: <BarChart3 size={20} />, label: 'Métricas' },
    { to: '/ai-config', icon: <Bot size={20} />, label: 'Configuração IA' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-white dark:bg-slate-900 border-right border-slate-200 dark:border-slate-800 flex flex-col p-6 sticky top-0">
      <div className="flex items-center gap-3 text-primary font-black text-2xl mb-10">
        <MessageSquare size={32} className="fill-current" />
        <span>ZapAssist</span>
      </div>
      
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <SidebarItem 
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.to}
          />
        ))}
      </nav>

      <div className="mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;

