import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const applySidebarWidth = () => {
      const lg = mq.matches;
      const w = !lg ? '0px' : isCollapsed ? '5rem' : '16rem';
      document.documentElement.style.setProperty('--layout-sidebar-width', w);
    };
    applySidebarWidth();
    mq.addEventListener('change', applySidebarWidth);
    return () => {
      mq.removeEventListener('change', applySidebarWidth);
      document.documentElement.style.removeProperty('--layout-sidebar-width');
    };
  }, [isCollapsed]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
        isCollapsed={isCollapsed} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          onMenuClick={() => setIsMobileOpen(true)} 
          isCollapsed={isCollapsed}
          onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
