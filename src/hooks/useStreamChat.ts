import { Channel } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import type { ChatStreamEvent, Message, ModelConfig } from '@/types';
import { useChatStore } from '@/store/chatStore';

export function useStreamChat() {
  const { appendMessage, appendChunk, persistMessage, setIsStreaming } = useChatStore();

  const sendMessage = async (
    conversationId: string,
    history: Message[],
    userContent: string,
    modelConfig: ModelConfig
  ) => {
    // Build user message
    const userMsg: Message = {
      id: uuidv4(),
      conversationId,
      role: 'user',
      content: userContent,
      createdAt: Date.now(),
    };
    appendMessage(userMsg);
    await persistMessage(userMsg);

    // Placeholder assistant message for streaming
    const assistantMsg: Message = {
      id: uuidv4(),
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    appendMessage(assistantMsg);
    setIsStreaming(true);

    const messages: Message[] = [...history, userMsg];

    const channel = new Channel<ChatStreamEvent>();
    channel.onmessage = (event) => {
      if (event.type === 'chunk') {
        appendChunk(conversationId, assistantMsg.id, event.content);
      } else if (event.type === 'done') {
        setIsStreaming(false);
        // Persist completed assistant message
        const finalMsg = useChatStore.getState().messages[conversationId]?.find(
          (m) => m.id === assistantMsg.id
        );
        if (finalMsg) {
          persistMessage(finalMsg).catch(console.error);
        }
      } else if (event.type === 'error') {
        setIsStreaming(false);
        appendChunk(conversationId, assistantMsg.id, `\n\n_Error: ${event.message}_`);
      }
    };

    try {
      await invoke('stream_chat', {
        messages,
        modelConfig,
        onEvent: channel,
      });
    } catch (err) {
      setIsStreaming(false);
      appendChunk(conversationId, assistantMsg.id, `\n\n_Error: ${String(err)}_`);
    }
  };

  return { sendMessage };
}
