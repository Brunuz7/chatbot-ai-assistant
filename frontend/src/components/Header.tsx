import React from 'react';
import { 
  Bell, 
  User,
  Menu,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isCollapsed, onCollapseToggle }) => {
  // Mock user data
  const user = {
    name: 'Admin User',
    role: 'Administrador'
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 md:px-8">
      {/* Left side: Menu Triggers */}
      <div className="flex items-center gap-2">
        {/* Mobile Menu Trigger */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onMenuClick} 
          className="lg:hidden p-2 text-slate-500 hover:text-primary"
        >
          <Menu size={24} />
        </Button>

        {/* Desktop Collapse Trigger */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCollapseToggle} 
          className="hidden lg:flex p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </Button>
      </div>

      {/* Right side: Actions & User Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 md:pr-4 mr-1 md:mr-2">
          <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Bell size={20} />
          </button>
          <button className="hidden sm:block p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 pl-1 cursor-pointer group">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none group-hover:text-primary transition-colors">{user.name}</span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{user.role}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
