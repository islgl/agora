import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { WikiPage } from '@/types';

/**
 * Wiki Layer cache.
 *
 * Holds a list of all pages in ~/.agora/wiki/ so the Settings Wiki tab
 * and the chat-time selector can read without round-tripping Rust on
 * every access. Contents (full markdown) are fetched on demand via
 * `read_wiki_page` — we never cache bodies here to keep memory bounded.
 */

interface WikiState {
  pages: WikiPage[];
  loading: boolean;
  lastRefreshedAt: number;
  /** Per-conversation record of which pages the selector injected on
   *  the most recent turn. Drives the in-chat "Wiki: N pages" chip so
   *  users see what context the agent is reading from. */
  lastInjected: Record<string, WikiPage[]>;
  refresh: () => Promise<WikiPage[]>;
  rebuildIndex: () => Promise<void>;
  deletePage: (relPath: string) => Promise<void>;
  setLastInjected: (conversationId: string, pages: WikiPage[]) => void;
}

export const useWikiStore = create<WikiState>()((set, get) => ({
  pages: [],
  loading: false,
  lastRefreshedAt: 0,
  lastInjected: {},

  setLastInjected: (conversationId, pages) => {
    set((s) => ({
      lastInjected: { ...s.lastInjected, [conversationId]: pages },
    }));
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const pages = await invoke<WikiPage[]>('list_wiki_pages');
      set({ pages, loading: false, lastRefreshedAt: Date.now() });
      return pages;
    } catch (err) {
      console.warn('list_wiki_pages failed', err);
      set({ pages: [], loading: false });
      return [];
    }
  },

  rebuildIndex: async () => {
    await invoke<string>('update_wiki_index');
    await get().refresh();
  },

  deletePage: async (relPath) => {
    await invoke<boolean>('delete_wiki_page', { relPath });
    await get().refresh();
  },
}));
