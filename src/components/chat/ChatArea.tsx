import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStreamChat } from '@/hooks/useStreamChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { toast } from 'sonner';

export function ChatArea() {
  const {
    currentConversationId,
    conversations,
    messages,
    isStreaming,
    loadMessages,
    renameConversation,
  } = useChatStore();

  const { modelConfigs, activeModelId, resolveModelConfig, globalSettings } =
    useSettingsStore();
  const { sendMessage } = useStreamChat();

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const currentMessages = currentConversationId
    ? (messages[currentConversationId] ?? [])
    : [];

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId, loadMessages]);

  const handleSend = async (content: string) => {
    if (!currentConversationId) return;

    const modelConfig = modelConfigs.find((m) => m.id === activeModelId);
    if (!modelConfig) {
      toast.error('Please configure a model in Settings first');
      return;
    }
    if (!globalSettings.apiKey.trim()) {
      toast.error('Please set your API key in Settings → Providers');
      return;
    }

    if (
      currentMessages.length === 0 &&
      currentConversation?.title === 'New conversation'
    ) {
      const autoTitle = content.slice(0, 40) + (content.length > 40 ? '…' : '');
      renameConversation(currentConversationId, autoTitle);
    }

    try {
      const resolved = resolveModelConfig(modelConfig);
      await sendMessage(currentConversationId, currentMessages, content, resolved);
    } catch (err) {
      toast.error(String(err));
    }
  };

  /* ── 无会话欢迎页 ── */
  if (!currentConversationId) {
    return (
      <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-4">
          <h1
            className="text-4xl text-foreground"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 500, lineHeight: 1.2 }}
          >
            How can I help?
          </h1>
          <p className="text-muted-foreground text-sm">
            Start a conversation or open an existing one
          </p>
        </div>
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    );
  }

  /* ── 活跃会话 ── */
  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <MessageList messages={currentMessages} isStreaming={isStreaming} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
