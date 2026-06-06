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
    <div className="flex h-screen overflow-hidden text-foreground">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} isCollapsed={isCollapsed} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
          onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        />

        <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 custom-scrollbar md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
