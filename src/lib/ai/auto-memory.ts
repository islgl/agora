import { embed, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { invoke } from '@tauri-apps/api/core';
import type { Message, ModelConfig } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';
import { modelForConfig } from './providers';
import { tauriProxyFetch } from './proxy-fetch';

/**
 * Phase 5 · automatic memory extraction + semantic recall.
 *
 * Two entry points:
 *   - `extractAndStoreMemories` runs after a turn finalizes. Fire-and-
 *     forget — the user's next reply shouldn't wait on a slow embedding.
 *   - `fetchAutoMemoryContext` returns a system-prompt-injectable block
 *     of the Top-K semantically nearest memories.
 *
 * Both run quietly; if embedding or LLM extraction fails, the turn keeps
 * working — we just skip memory for that cycle.
 */

const SEARCH_LIMIT = 5;
const CONTEXT_BUDGET_BYTES = 2 * 1024;
const SEARCH_CACHE_TTL_MS = 60_000;

interface MemoryRow {
  id: string;
  text: string;
  kind: string;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  createdAt: number;
  score?: number | null;
}

interface SearchArgs {
  vector: number[];
  limit?: number;
}

interface SearchResult {
  rows: MemoryRow[];
}

/** Per-query cache so a chatty user doesn't embed the same thing 5 times. */
const searchCache = new Map<string, { at: number; rows: MemoryRow[] }>();

export async function fetchAutoMemoryContext(query: string): Promise<{
  block: string;
  rows: MemoryRow[];
} | null> {
  if (!query.trim()) return null;

  const cacheKey = query.slice(0, 400);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL_MS) {
    return cached.rows.length > 0 ? formatBlock(cached.rows) : null;
  }

  const vector = await embedText(query);
  if (!vector) return null;

  try {
    const result = await invoke<SearchResult>('search_auto_memory', {
      args: { vector, limit: SEARCH_LIMIT } satisfies SearchArgs,
    });
    searchCache.set(cacheKey, { at: Date.now(), rows: result.rows });
    if (result.rows.length === 0) return null;
    return formatBlock(result.rows);
  } catch (err) {
    console.warn('search_auto_memory failed', err);
    return null;
  }
}

function formatBlock(rows: MemoryRow[]): { block: string; rows: MemoryRow[] } {
  const lines: string[] = [];
  let used = 0;
  const kept: MemoryRow[] = [];
  for (const r of rows) {
    const prefix = `- (${r.kind}) `;
    const line = prefix + r.text;
    if (used + line.length > CONTEXT_BUDGET_BYTES) break;
    lines.push(line);
    kept.push(r);
    used += line.length;
  }
  if (lines.length === 0) return { block: '', rows: [] };
  const block = `<auto_memory>\n${lines.join('\n')}\n</auto_memory>`;
  return { block, rows: kept };
}

/**
 * Post-turn extraction. Classifies the turn into 0-3 candidate memories,
 * embeds each, persists via `add_auto_memory`. Swallows errors.
 */
export async function extractAndStoreMemories(opts: {
  conversationId: string;
  userMessage: Message | null;
  assistantMessage: Message | null;
}): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.globalSettings.autoMemoryEnabled) return;
  const modelConfig = settings.modelConfigs.find(
    (m) => m.id === settings.activeModelId,
  );
  if (!modelConfig) return;
  if (!opts.userMessage || !opts.assistantMessage) return;

  const resolved = settings.resolveModelConfig(modelConfig);
  const userText = flattenMessageContent(opts.userMessage);
  const assistantText = flattenMessageContent(opts.assistantMessage);
  if (!userText.trim() && !assistantText.trim()) return;

  let candidates: Candidate[] = [];
  try {
    candidates = await runExtractor(resolved, userText, assistantText);
  } catch (err) {
    console.warn('auto memory extractor failed', err);
    return;
  }
  if (candidates.length === 0) return;

  for (const cand of candidates) {
    try {
      const vector = await embedText(cand.text);
      if (!vector) continue;
      await invoke('add_auto_memory', {
        args: {
          text: cand.text,
          kind: cand.kind,
          vector,
          sourceConversationId: opts.conversationId,
          sourceMessageId: opts.assistantMessage.id,
        },
      });
    } catch (err) {
      console.warn('add_auto_memory failed', err);
    }
  }
}

interface Candidate {
  text: string;
  kind: 'preference' | 'fact' | 'event' | 'project';
}

async function runExtractor(
  model: ModelConfig,
  userText: string,
  assistantText: string,
): Promise<Candidate[]> {
  const promptParts = [
    'From this conversation turn, extract 0-3 items worth long-term memory. Only extract:',
    '- preference: user enduring preferences / style / tooling',
    '- fact: durable facts about the user (role, timezone, stack, subscriptions)',
    '- event: a specific in-progress thing ("user is debugging foo module")',
    '- project: named ongoing projects',
    '',
    "Skip: one-off Q&A answers, generic knowledge, small talk, code output that isn't about the user.",
    '',
    'Return JSON ONLY, no prose:',
    '{"items": [{"text": "...", "kind": "preference|fact|event|project"}]}',
    'If nothing qualifies, return {"items": []}.',
    '',
    'User:',
    truncate(userText, 1500),
    '',
    'Assistant:',
    truncate(assistantText, 1500),
  ];
  const prompt = promptParts.join('\n');

  const result = await generateText({
    model: modelForConfig(model),
    prompt,
    maxOutputTokens: 400,
  });
  return parseCandidates(result.text);
}

function parseCandidates(raw: string): Candidate[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { items?: unknown };
    if (!Array.isArray(parsed.items)) return [];
    const allowed = new Set(['preference', 'fact', 'event', 'project']);
    return parsed.items.flatMap((raw): Candidate[] => {
      if (!raw || typeof raw !== 'object') return [];
      const r = raw as Record<string, unknown>;
      const text = typeof r.text === 'string' ? r.text.trim() : '';
      const kind = typeof r.kind === 'string' ? r.kind : '';
      if (!text || !allowed.has(kind)) return [];
      return [{ text, kind: kind as Candidate['kind'] }];
    });
  } catch {
    return [];
  }
}

/**
 * Embed a single string using the provider configured in global settings.
 * Falls back gracefully: unsupported provider → null, network error → null.
 * Each embedding call piggybacks on `tauriProxyFetch` so the user's API key
 * is injected server-side the same way chat traffic already flows.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  const settings = useSettingsStore.getState();
  const g = settings.globalSettings;
  // Prefer the active embedding config from the list, but fall back to the
  // legacy `embeddingModel` field so this keeps working during first-load
  // before the settingsStore has seeded the list.
  const active =
    settings.embeddingConfigs.find((c) => c.id === settings.activeEmbeddingId) ??
    settings.embeddingConfigs[0];
  const modelName = active?.model ?? g.embeddingModel ?? 'text-embedding-3-small';
  // Common embedding URL → chat-side OpenAI URL. Gateway routing within
  // a shared base URL is handled via the per-config `providerId` header,
  // not a per-provider URL override.
  const resolvedBaseUrl = g.baseUrlEmbeddingCommon.trim() || g.baseUrlOpenai;

  // Base headers every request carries: a provider hint so the Rust proxy
  // knows where to inject the shared API key when the custom baseURL
  // doesn't prefix-match any configured provider. If the active config
  // defines a gateway provider id, tack it on as X-Model-Provider-Id so
  // the upstream gateway routes to the right backend model.
  const headers: Record<string, string> = {
    'x-agora-provider-hint': 'openai',
  };
  const gatewayProviderId = (active?.providerId ?? '').trim();
  if (gatewayProviderId) {
    headers['X-Model-Provider-Id'] = gatewayProviderId;
  }

  try {
    const client = createOpenAI({
      apiKey: 'proxied-by-tauri',
      baseURL: resolvedBaseUrl.replace(/\/+$/, ''),
      headers,
      fetch: tauriProxyFetch,
    });
    const res = await embed({
      model: client.textEmbeddingModel(modelName),
      value: text.slice(0, 8000),
    });
    return Array.from(res.embedding);
  } catch (err) {
    console.warn(`embedText(openai/${modelName}) failed`, err);
    return null;
  }
}

function flattenMessageContent(m: Message): string {
  if (m.parts && m.parts.length > 0) {
    const text: string[] = [];
    for (const p of m.parts) {
      if (p.type === 'text' && p.text) text.push(p.text);
    }
    if (text.length > 0) return text.join('\n');
  }
  return m.content ?? '';
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}