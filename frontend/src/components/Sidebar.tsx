import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  BookOpen,
  Users,
  Bot,
  Settings,
  LogOut,
  Tags,
  Megaphone,
  Store,
  X,
} from 'lucide-react';
import { authService } from '../services/AuthService';
import logo from '../assets/logo.svg';
import logoLight from '../assets/logo-light.svg';
import { useTheme } from '../contexts/ThemeContext';
function isSidebarNavActive(pathname: string, to: string): boolean {
  if (to === '/inicio') return pathname === '/inicio' || pathname === '/';
  if (to === '/configuracoes') return pathname === '/configuracoes' || pathname.startsWith('/configuracoes?');
  return pathname === to || pathname.startsWith(`${to}/`);
}

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
    className={`group relative flex items-center rounded-xl px-3 py-2.5 transition-colors duration-200 ${
      collapsed ? 'justify-center' : 'gap-3'
    } ${
      active
        ? 'bg-primary-a10 text-primary [&_svg]:stroke-primary [&_svg]:text-primary'
        : 'text-foreground-muted hover:bg-surface-hover hover:text-primary [&_svg]:stroke-current'
    }`}>
    <span className={`flex shrink-0 items-center justify-center ${collapsed ? '' : 'w-5'}`}>{icon}</span>

    <span
      className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 ${
        collapsed ? 'w-0 opacity-0' : 'min-w-0 flex-1 opacity-100'
      }`}>
      {label}
    </span>

    {collapsed ? (
      <div className="pointer-events-none invisible absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-overlay px-2 py-1 text-[10px] text-foreground-inverse opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
        {label}
      </div>
    ) : null}
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
  const { resolved } = useTheme();

  const menuExpanded = !isCollapsed || isMobileOpen;

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const menuItems = [
    { to: '/inicio', icon: <LayoutDashboard size={20} />, label: 'Início' },
    { to: '/fluxos', icon: <Zap size={20} />, label: 'Fluxos' },
    { to: '/agentes', icon: <Bot size={20} />, label: 'Agentes' },
    { to: '/base-conhecimento', icon: <BookOpen size={20} />, label: 'Base de conhecimento' },
    { to: '/loja-integrada', icon: <Store size={20} />, label: 'Loja integrada' },
    { to: '/contatos', icon: <Users size={20} />, label: 'Contatos' },
    { to: '/classificacao-contatos', icon: <Tags size={20} />, label: 'Classificação de contatos' },
    { to: '/envio-em-massa', icon: <Megaphone size={20} />, label: 'Envio em massa' },
    { to: '/configuracoes', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      authService.clearAccessToken();
      navigate('/entrar');
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-overlay-a45 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width,transform] lg:static
          ${isMobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}>
        <div className="relative flex h-16 shrink-0 items-center border-b border-border-subtle px-4">
          <div className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
            <img
              src={resolved === 'dark' ? logo : logoLight}
              alt="Assistente Prestei"
              className={`object-contain object-left transition-all duration-300 ${isCollapsed ? 'h-6 max-w-full' : 'h-7'}`}
            />

            <button
              type="button"
              className="absolute right-4 p-1 text-foreground-icon hover:text-primary lg:hidden"
              onClick={() => setIsMobileOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
          <div className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={isSidebarNavActive(location.pathname, item.to)}
                collapsed={!menuExpanded}
              />
            ))}
          </div>

          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-left text-danger transition-colors duration-200 hover:bg-danger-muted hover:text-danger [&_svg]:stroke-current ${
                menuExpanded ? 'justify-start gap-3' : 'justify-center'
              }`}>
              <span className={`flex shrink-0 items-center justify-center ${menuExpanded ? 'w-5' : ''}`}>
                <LogOut size={20} />
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                  menuExpanded ? 'min-w-0 opacity-100' : 'w-0 opacity-0'
                }`}>
                Sair
              </span>
              {!menuExpanded ? (
                <div className="pointer-events-none invisible absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-overlay px-2 py-1 text-[10px] text-foreground-inverse opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                  Sair
                </div>
              ) : null}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
