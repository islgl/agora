import { useChatStore } from '@/store/chatStore';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  search?: string;
}

export function ConversationList({ search = '' }: ConversationListProps) {
  const { conversations, currentConversationId } = useChatStore();

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  if (conversations.length === 0) {
    return (
      <div className="px-2 py-4 text-xs text-muted-foreground text-center">
        No conversations yet
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="px-2 py-4 text-xs text-muted-foreground text-center">
        No results
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
      {filtered.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === currentConversationId}
        />
      ))}
    </ul>
  );
}
