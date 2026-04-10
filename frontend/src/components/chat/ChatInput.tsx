import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-bc-border bg-bc-bg-subtle p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-3 rounded-xl border border-bc-border bg-bc-bg-muted px-4 py-3 transition-all focus-within:border-bc-primary/30">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-bc-text-dark placeholder-bc-text-muted outline-none max-h-[200px]"
            disabled={disabled}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !content.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bc-primary text-white transition-all hover:bg-bc-primary-dark disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {disabled ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-bc-text-muted">
          AI may produce inaccurate information. Verify important details.
        </p>
      </div>
    </div>
  );
}
