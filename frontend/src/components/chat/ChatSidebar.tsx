import React from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import type { ChatSession } from '../../types';

interface Props {
  sessions: ChatSession[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ChatSidebar({ sessions, activeId, onSelect, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-xs text-text-muted">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={clsx(
            'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200',
            activeId === session.id
              ? 'bg-accent/10 text-accent-light'
              : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary',
          )}
          onClick={() => onSelect(session.id)}
        >
          <MessageSquare size={16} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm">{session.title}</p>
            {session.context && (
              <p className="truncate text-xs text-text-muted">{session.context.name}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            className="shrink-0 rounded p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
