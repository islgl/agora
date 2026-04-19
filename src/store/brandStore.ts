import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { BrandPayload, BrandEditableFile } from '@/types';

/**
 * Brand Layer cache.
 *
 * Mirrors ~/.agora/config/*.md into memory so `buildSystemPrompt` can
 * read it synchronously. `refresh()` is called once on mount and before
 * every turn — see `useAiSdkChat.ts`.
 *
 * Shape chosen to match `agentMdStore.ts` so patterns stay consistent.
 */

const EMPTY_SECTION = { path: null, content: '', truncated: false };

const EMPTY: BrandPayload = {
  soul: EMPTY_SECTION,
  user: EMPTY_SECTION,
  tools: EMPTY_SECTION,
  memory: EMPTY_SECTION,
  agents: EMPTY_SECTION,
  configDir: '',
};

interface BrandState {
  payload: BrandPayload;
  loading: boolean;
  refresh: () => Promise<void>;
  writeFile: (file: BrandEditableFile, content: string) => Promise<void>;
}

export const useBrandStore = create<BrandState>()((set, get) => ({
  payload: EMPTY,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const payload = await invoke<BrandPayload>('read_brand');
      set({ payload, loading: false });
    } catch (err) {
      console.warn('read_brand failed', err);
      set({ payload: EMPTY, loading: false });
    }
  },

  writeFile: async (file, content) => {
    await invoke('write_brand_file', { file, content });
    // Re-read so the local cache stays authoritative and the next
    // `buildSystemPrompt` call sees the new content.
    await get().refresh();
  },
}));
