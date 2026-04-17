import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '@/components/settings/ModelSelector';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter while a Chinese / Japanese / Korean IME is composing —
    // the keystroke is confirming a candidate, not sending the message.
    // keyCode 229 is the WebKit/Safari fallback when isComposing isn't set.
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [value]);

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Input card — Claude ivory surface with warm ring + whisper shadow */}
        <div
          className="rounded-2xl bg-card overflow-hidden"
          style={{
            boxShadow: '0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,0.05)',
          }}
        >
          <div className="px-4 pt-3.5 pb-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              rows={1}
              disabled={disabled}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm text-foreground
                         leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0
                         min-h-[24px] max-h-[180px]
                         placeholder:text-muted-foreground placeholder:font-[Georgia,serif]"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            <ModelSelector />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="size-8 rounded-full flex items-center justify-center transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed
                         bg-primary text-primary-foreground hover:bg-primary/90"
              style={canSend ? { boxShadow: '0 0 0 1px var(--primary)' } : {}}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2.5">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
