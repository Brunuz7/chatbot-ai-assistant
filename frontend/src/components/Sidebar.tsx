import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Zap, 
  BookOpen, 
  Users, 
  Bot, 
  FileText,
  Settings,
  LogOut,
  MessageSquare,
  Tags,
  Megaphone,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import api from '../services/api';
import { appMeta } from '../config/appMeta';
import logo from '../assets/logo.svg';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active, collapsed, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center px-3 py-2.5 rounded-xl font-medium transition-all duration-300 group relative ${
      active 
        ? 'bg-primary/10 text-primary' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
    }`}
  >
    <div className={`transition-all duration-300 flex items-center justify-center shrink-0 ${collapsed ? 'w-full' : 'w-10'}`}>
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
    </div>
    
    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap flex items-center ${collapsed ? 'w-0 opacity-0' : 'w-48 opacity-100 ml-2'}`}>
      <span className="text-sm font-medium">{label}</span>
    </div>
    
    {collapsed && (
      <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl pointer-events-none">
        {label}
      </div>
    )}
  </Link>
);

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, isCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const menuItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Início' },
    { to: '/automations', icon: <Zap size={20} />, label: 'Fluxo' },
    { to: '/agents', icon: <Bot size={20} />, label: 'Agentes' },
    { to: '/knowledge', icon: <BookOpen size={20} />, label: 'Base de conhecimento' },
    { to: '/contacts', icon: <Users size={20} />, label: 'Contatos' },
    { to: '/lead-tags', icon: <Tags size={20} />, label: 'Tags de leads' },
    { to: '/bulk-messages', icon: <Megaphone size={20} />, label: 'Envio em massa' },
    { to: '/conversations', icon: <MessageSquare size={20} />, label: 'Conversas' },
    { to: '/instructions', icon: <FileText size={20} />, label: 'Instruções' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 lg:static flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width,transform]
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        
        {/* Header */}
        <div className="p-4 mb-2 overflow-hidden shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
            <div className="flex items-center gap-3 shrink-0">
              <div className="shrink-0 flex items-center justify-center bg-slate-900 dark:bg-white/5 p-2 rounded-xl">
                <img 
                  src={logo} 
                  alt={appMeta.title} 
                  className={`transition-all duration-300 object-contain ${isCollapsed ? 'h-6 w-6' : 'h-6'}`} 
                />
              </div>
              {!isCollapsed && (
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {appMeta.shortTitle}
                </span>
              )}
            </div>
            
            {/* Close button for mobile */}
            <button className="lg:hidden text-slate-500 hover:text-primary p-1 absolute right-4" onClick={() => setIsMobileOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
              collapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Button 
            variant="ghost" 
            className={`w-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 rounded-xl transition-all duration-300 flex items-center px-0 ${isCollapsed ? 'justify-center' : 'justify-start px-3'}`}
            onClick={handleLogout}
          >
            <div className={`flex items-center justify-center shrink-0 ${isCollapsed ? 'w-full' : 'w-5'}`}>
              <LogOut size={18} />
            </div>
            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-48 opacity-100 ml-3'}`}>
              <span className="text-sm font-medium">Sair</span>
            </div>
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
