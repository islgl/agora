import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

// Soft-fade the top edge of the scrollable area so messages ease out of view
// instead of clipping against the traffic-light row. The fade height matches
// the scroll container's top padding so the first message doesn't look
// half-faded when scrolled to the top.
const FADE_PX = 32;
const TOP_FADE_MASK =
  `linear-gradient(to bottom, transparent 0, black ${FADE_PX}px)`;

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  // Also scroll on streaming chunks
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  });

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-2xl font-semibold text-foreground">Agora</p>
          <p className="text-sm text-muted-foreground">Start a conversation below</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto"
      style={{
        maskImage: TOP_FADE_MASK,
        WebkitMaskImage: TOP_FADE_MASK,
      }}
    >
      <div
        className="max-w-3xl mx-auto px-4 pb-6"
        style={{ paddingTop: FADE_PX }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
