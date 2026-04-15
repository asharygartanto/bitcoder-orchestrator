import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  MessageSquare,
  Settings,
  Server,
  Users,
  Key,
  Activity,
  Building2,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import BitcoderLogo from '../common/BitcoderLogo';
import { getMyBranding } from '../../services/client';
import type { ClientBranding } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

const DEFAULT_BRANDING: ClientBranding = {
  title: 'Bitcoder Orchestrator',
  primaryColor: '#157382',
  logoUrl: null,
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [branding, setBranding] = useState<ClientBranding>(DEFAULT_BRANDING);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      getMyBranding()
        .then((b) => {
          if (b) setBranding(b);
        })
        .catch(() => {});
    }
  }, [user]);

  const pc = branding.primaryColor || '#157382';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside
        className={clsx(
          'flex flex-col border-r transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
        style={{ borderColor: `${pc}20`, background: `${pc}03` }}
      >
        <div
          className="flex h-14 items-center justify-between border-b px-4"
          style={{ borderColor: `${pc}15` }}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
              ) : (
                <BitcoderLogo className="h-8 w-8" />
              )}
              <span className="text-sm font-semibold truncate" style={{ color: `${pc}dd` }}>
                {branding.title || 'Bitcoder Orchestrator'}
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 hover:bg-black/5 transition-colors"
            style={{ color: `${pc}88` }}
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
            primaryColor={pc}
          />
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings size={20} />}
              label="Admin Panel"
              active={location.pathname === '/admin'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {isAdmin && (
            <NavLink
              to="/clients"
              icon={<Server size={20} />}
              label="Clients"
              active={location.pathname === '/clients'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {isAdmin && (
            <NavLink
              to="/users"
              icon={<Users size={20} />}
              label="Users"
              active={location.pathname === '/users'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {isAdmin && (
            <NavLink
              to="/departments"
              icon={<Building2 size={20} />}
              label="Org Structure"
              active={location.pathname === '/departments'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {isAdmin && (
            <NavLink
              to="/api-keys"
              icon={<Key size={20} />}
              label="API Keys"
              active={location.pathname === '/api-keys'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <NavLink
              to="/monitoring"
              icon={<Activity size={20} />}
              label="Monitoring"
              active={location.pathname === '/monitoring'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <NavLink
              to="/licenses"
              icon={<Shield size={20} />}
              label="Licenses"
              active={location.pathname === '/licenses'}
              collapsed={sidebarCollapsed}
              primaryColor={pc}
            />
          )}
        </nav>

        <div className="border-t p-3" style={{ borderColor: `${pc}15` }}>
          <div
            className={clsx(
              'flex items-center gap-3',
              sidebarCollapsed && 'justify-center',
            )}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
              style={{ background: `${pc}15`, color: pc }}
            >
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

        <div
          className="border-t px-3 py-2 text-center"
          style={{ borderColor: `${pc}10` }}
        >
          {!sidebarCollapsed ? (
            <p className="text-[9px] leading-tight text-bc-text-muted">
              Powered by <span className="font-semibold" style={{ color: pc }}>Bitcoder</span>
              <br />
              <span className="text-bc-text-muted">Bale Inovasi Teknologi</span>
            </p>
          ) : (
            <p className="text-[7px] text-bc-text-muted">
              <span className="font-semibold" style={{ color: pc }}>BC</span>
            </p>
          )}
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
  primaryColor,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  primaryColor: string;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
        collapsed && 'justify-center px-2',
      )}
      style={{
        background: active ? `${primaryColor}12` : undefined,
        color: active ? primaryColor : undefined,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = `${primaryColor}08`;
          e.currentTarget.style.color = '#1a2b3c';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = '';
        }
      }}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
