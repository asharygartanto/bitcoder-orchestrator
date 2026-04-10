export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
        <span className="text-accent text-xs">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-md bg-surface-2 border border-[hsl(var(--border))] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
          <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}
