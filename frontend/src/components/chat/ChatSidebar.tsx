import React, { useMemo } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import type { ChatSession } from '../../types';

interface Props {
  sessions: ChatSession[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;

  const years = Math.floor(diffDays / 365);
  return `${years} tahun lalu`;
}

export default function ChatSidebar({ sessions, activeId, onSelect, onDelete }: Props) {
  const grouped = useMemo(() => {
    const groups: { label: string; sessions: ChatSession[] }[] = [];
    const map = new Map<string, ChatSession[]>();

    for (const session of sessions) {
      const date = new Date(session.updatedAt);
      const label = getDateLabel(date);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(session);
    }

    for (const [label, items] of map) {
      groups.push({ label, sessions: items });
    }

    return groups;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-xs text-bc-text-muted">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {grouped.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-3 py-1.5 text-xs font-semibold text-bc-text-muted uppercase tracking-wide">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.sessions.map((session) => (
              <div
                key={session.id}
                className={clsx(
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200',
                  activeId === session.id
                    ? 'bg-bc-primary/10 text-bc-primary'
                    : 'text-bc-text-secondary hover:bg-bc-bg-dark hover:text-bc-text-dark',
                )}
                onClick={() => onSelect(session.id)}
              >
                <MessageSquare size={16} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{session.title}</p>
                  {session.context && (
                    <p className="truncate text-xs text-bc-text-muted">{session.context.name}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="shrink-0 rounded p-1 text-bc-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
