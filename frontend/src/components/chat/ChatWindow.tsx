import { useRef, useEffect } from 'react';
import type { ChatMessage as ChatMessageType, SourceReference } from '../../types';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import BitcoderLogo from '../common/BitcoderLogo';

interface Props {
  messages: ChatMessageType[];
  isSending: boolean;
  streamingContent: string;
  streamingSources: SourceReference[];
}

export default function ChatWindow({
  messages,
  isSending,
  streamingContent,
  streamingSources,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isSending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <BitcoderLogo className="h-16 w-16 text-bc-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-bc-text-dark">How can I help you?</h2>
          <p className="mt-2 text-sm text-bc-text-muted max-w-md">
            Select a context and start asking questions. I'll search through your documents and APIs to provide accurate answers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isSending && streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              sessionId: '',
              role: 'ASSISTANT',
              content: streamingContent,
              references: streamingSources.length > 0
                ? { sources: streamingSources, api_results: null }
                : null,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        {isSending && !streamingContent && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
