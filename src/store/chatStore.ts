import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Conversation, Message } from '@/types';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  currentConversationId: string | null;
  isStreaming: boolean;

  // Conversation actions
  setCurrentConversation: (id: string | null) => void;
  loadConversations: () => Promise<void>;
  createConversation: (title: string, modelId: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;

  // Message actions
  loadMessages: (conversationId: string) => Promise<void>;
  appendMessage: (msg: Message) => void;
  appendChunk: (conversationId: string, messageId: string, chunk: string) => void;
  persistMessage: (msg: Message) => Promise<void>;
  setIsStreaming: (v: boolean) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  messages: {},
  currentConversationId: null,
  isStreaming: false,

  setCurrentConversation: (id) => set({ currentConversationId: id }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  loadConversations: async () => {
    const conversations = await invoke<Conversation[]>('load_conversations');
    set((state) => {
      // Reconcile: if currentConversationId no longer exists in SQLite,
      // drop it so the UI falls back to the welcome view.
      const stillExists =
        state.currentConversationId &&
        conversations.some((c) => c.id === state.currentConversationId);
      return {
        conversations,
        currentConversationId: stillExists ? state.currentConversationId : null,
      };
    });
  },

  createConversation: async (title, modelId) => {
    const conv = await invoke<Conversation>('create_conversation', { title, modelId });
    set((state) => ({
      conversations: [conv, ...state.conversations],
      currentConversationId: conv.id,
    }));
    return conv;
  },

  deleteConversation: async (id) => {
    await invoke('delete_conversation', { id });
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      const messages = { ...state.messages };
      delete messages[id];
      const currentConversationId =
        state.currentConversationId === id
          ? (conversations[0]?.id ?? null)
          : state.currentConversationId;
      return { conversations, messages, currentConversationId };
    });
  },

  renameConversation: async (id, title) => {
    await invoke('rename_conversation', { id, title });
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  loadMessages: async (conversationId) => {
    if (get().messages[conversationId]) return;
    const msgs = await invoke<Message[]>('load_messages', { conversationId });
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs },
    }));
  },

  appendMessage: (msg) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.conversationId]: [
          ...(state.messages[msg.conversationId] ?? []),
          msg,
        ],
      },
    }));
  },

  appendChunk: (conversationId, messageId, chunk) => {
    set((state) => {
      const msgs = state.messages[conversationId] ?? [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, content: m.content + chunk } : m
          ),
        },
      };
    });
  },

  persistMessage: async (msg) => {
    await invoke('save_message', { message: msg });
  },
}));
