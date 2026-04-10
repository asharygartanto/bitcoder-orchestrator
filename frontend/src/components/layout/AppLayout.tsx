import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside
        className={clsx(
          'flex flex-col border-r border-bc-border bg-white transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-bc-border px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Bitcoder" className="h-8 w-8" />
              <span className="text-sm font-semibold text-bc-primary">Bitcoder Orchestrator</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 text-bc-text-muted hover:bg-bc-bg-muted hover:text-bc-text-secondary transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <NavLink
            to="/"
            icon={<MessageSquare size={20} />}
            label="Chat"
            active={location.pathname === '/'}
            collapsed={sidebarCollapsed}
          />
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings size={20} />}
              label="Admin Panel"
              active={location.pathname === '/admin'}
              collapsed={sidebarCollapsed}
            />
          )}
        </nav>

        <div className="border-t border-bc-border p-3">
          <div
            className={clsx(
              'flex items-center gap-3',
              sidebarCollapsed && 'justify-center',
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bc-primary/10 text-bc-primary text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || user?.email[0]?.toUpperCase() || '?'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-bc-text-dark">
                  {user?.name || user?.email}
                </p>
                <p className="truncate text-xs text-bc-text-muted">{user?.organization?.name}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden bg-white">{children}</main>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  active,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-bc-primary/10 text-bc-primary'
          : 'text-bc-text-secondary hover:bg-bc-bg-muted hover:text-bc-text-dark',
        collapsed && 'justify-center px-2',
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
