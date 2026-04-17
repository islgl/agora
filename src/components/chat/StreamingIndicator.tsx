export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2 mb-6">
      <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
      <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
      <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" />
    </div>
  );
}
