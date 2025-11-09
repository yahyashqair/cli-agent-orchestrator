import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  className?: string;
}

export function Layout({ className }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className={cn('h-screen flex bg-background', className)}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto custom-scrollbar p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}