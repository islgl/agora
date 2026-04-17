import { MarkdownRenderer } from './MarkdownRenderer';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed
                     bg-secondary text-foreground whitespace-pre-wrap"
          style={{ boxShadow: '0 0 0 1px var(--ring-warm)' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] text-sm leading-relaxed text-foreground">
        {message.content ? (
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={message.content} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
