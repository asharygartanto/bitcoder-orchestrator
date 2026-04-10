import React from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { Context } from '../../types';

interface Props {
  contexts: Context[];
  selected: Context | null;
  onSelect: (context: Context | null) => void;
}

export default function ContextSelector({ contexts, selected, onSelect }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-bc-border bg-bc-bg-muted px-3 py-2 text-xs text-bc-text-secondary transition-all hover:border-bc-border-hover"
      >
        <span className="truncate">
          {selected ? selected.name : 'All contexts'}
        </span>
        <ChevronDown
          size={14}
          className={clsx('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-bc-border bg-bc-bg-muted py-1 shadow-lg animate-fade-in">
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className={clsx(
                'w-full px-3 py-2 text-left text-xs transition-colors hover:bg-bc-bg-dark',
                !selected ? 'text-bc-primary' : 'text-bc-text-secondary',
              )}
            >
              All contexts
            </button>
            {contexts.map((ctx) => (
              <button
                key={ctx.id}
                onClick={() => { onSelect(ctx); setOpen(false); }}
                className={clsx(
                  'w-full px-3 py-2 text-left text-xs transition-colors hover:bg-bc-bg-dark',
                  selected?.id === ctx.id ? 'text-bc-primary' : 'text-bc-text-secondary',
                )}
              >
                {ctx.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
