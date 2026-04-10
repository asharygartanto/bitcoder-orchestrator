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
    <div className="flex h-screen overflow-hidden">
      <aside
        className={clsx(
          'flex flex-col border-r border-[hsl(var(--border))] bg-surface-1 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] px-4">
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold text-accent-light">Bitcoder AI</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors"
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

        <div className="border-t border-[hsl(var(--border))] p-3">
          <div
            className={clsx(
              'flex items-center gap-3',
              sidebarCollapsed && 'justify-center',
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || user?.email[0]?.toUpperCase() || '?'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {user?.name || user?.email}
                </p>
                <p className="truncate text-xs text-text-tertiary">{user?.organization?.name}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">{children}</main>
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
          ? 'bg-accent/10 text-accent-light glow-border'
          : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary',
        collapsed && 'justify-center px-2',
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
