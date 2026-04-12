export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bc-primary/10">
        <span className="text-bc-primary text-[10px] font-bold">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-md bg-bc-bg-muted border border-bc-border px-5 py-3.5">
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full bg-bc-primary animate-dot-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-bc-primary/70 animate-dot-bounce"
            style={{ animationDelay: '160ms' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-bc-primary/40 animate-dot-bounce"
            style={{ animationDelay: '320ms' }}
          />
        </div>
      </div>
    </div>
  );
}
