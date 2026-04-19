import { generateText } from 'ai';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/store/settingsStore';
import { useWikiStore } from '@/store/wikiStore';
import type { WikiPage, WikiPageContents } from '@/types';
import { modelForConfig } from './providers';

/**
 * Wiki selector — picks up to N pages relevant to the user's current turn.
 *
 * Strategy: we hand a compact index (title + summary + tags, no bodies)
 * to a lightweight LLM call and ask for JSON: {selected: string[]}. The
 * selected rel_paths are then read in full and inlined into the system
 * prompt. This is Karpathy's LLM-Wiki loop — no vector retrieval, just
 * a long-context read over pre-organized knowledge.
 *
 * Cached per query hash for 60s so a multi-turn back-and-forth doesn't
 * re-pay the selector cost on unchanged context.
 */

const TOP_K = 3;
const CACHE_TTL_MS = 60_000;
const SELECTOR_TIMEOUT_MS = 8_000;

interface CacheEntry {
  at: number;
  pages: WikiPage[];
}
const cache = new Map<string, CacheEntry>();

function cacheKey(query: string, wikiMtime: number): string {
  return `${wikiMtime}::${query.slice(0, 400)}`;
}

/**
 * Pick wiki pages relevant to `query`. Returns the page metadata; callers
 * then `read_wiki_page` for the full content. An empty return means either
 * the wiki is empty, the selector declined, or the LLM call failed — all
 * of which the caller treats as "inject nothing".
 */
export async function selectRelevantWikiPages(query: string): Promise<WikiPage[]> {
  if (!query.trim()) return [];

  const wiki = useWikiStore.getState();
  // Refresh if the cache is older than 30s — rebuilds after ingest can
  // arrive at any time, and paying a list call every 30s is cheap.
  if (Date.now() - wiki.lastRefreshedAt > 30_000) {
    await wiki.refresh();
  }
  const pages = useWikiStore.getState().pages;
  if (pages.length === 0) return [];

  const mtime = useWikiStore.getState().lastRefreshedAt;
  const key = cacheKey(query, mtime);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.pages;
  }

  // Very small wikis (≤ top_k): skip the selector call entirely. The
  // saved token/latency cost is real, and picking "all of them" is
  // exactly what the selector would return.
  if (pages.length <= TOP_K) {
    cache.set(key, { at: Date.now(), pages });
    return pages;
  }

  const settings = useSettingsStore.getState();
  const activeModelId = settings.activeModelId;
  const modelConfig = settings.modelConfigs.find((m) => m.id === activeModelId);
  if (!modelConfig) return [];
  const resolved = settings.resolveModelConfig(modelConfig);

  const index = buildCompactIndex(pages);
  const prompt = buildSelectorPrompt(query, index);

  try {
    const result = await Promise.race([
      generateText({
        model: modelForConfig(resolved),
        prompt,
        // Cap output — we only need a JSON array of paths, not prose.
        maxOutputTokens: 400,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('selector timeout')), SELECTOR_TIMEOUT_MS),
      ),
    ]);

    const picks = parsePicks(result.text, pages);
    cache.set(key, { at: Date.now(), pages: picks });
    return picks;
  } catch (err) {
    console.warn('wiki selector failed; skipping wiki injection', err);
    cache.set(key, { at: Date.now(), pages: [] });
    return [];
  }
}

function buildCompactIndex(pages: WikiPage[]): string {
  return pages
    .map((p) => {
      const bits: string[] = [`• ${p.relPath}: ${p.title}`];
      if (p.summary) bits.push(`  summary: ${p.summary}`);
      if (p.tags.length > 0) bits.push(`  tags: ${p.tags.join(', ')}`);
      if (p.category) bits.push(`  category: ${p.category}`);
      return bits.join('\n');
    })
    .join('\n');
}

function buildSelectorPrompt(query: string, index: string): string {
  return `You are a retrieval helper. Given a user query and an index of \
wiki pages, return the rel_paths of pages that would genuinely help answer \
the query. Be selective: pick AT MOST ${TOP_K}. Return [] if nothing in the \
index is closely relevant — irrelevant injections hurt more than they help.

Wiki index:
${index}

User query:
${query}

Respond with JSON ONLY, no prose:
{"selected": ["rel/path/a.md", "rel/path/b.md"]}`;
}

function parsePicks(raw: string, pages: WikiPage[]): WikiPage[] {
  // Models sometimes wrap JSON in ```json fences or add chatter. Find
  // the first balanced {...} and try to parse.
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('selected' in parsed) ||
      !Array.isArray((parsed as { selected: unknown }).selected)
    ) {
      return [];
    }
    const selected = (parsed as { selected: unknown[] }).selected.filter(
      (x): x is string => typeof x === 'string',
    );
    const byPath = new Map(pages.map((p) => [p.relPath, p]));
    return selected
      .map((rp) => byPath.get(rp))
      .filter((p): p is WikiPage => Boolean(p))
      .slice(0, TOP_K);
  } catch {
    return [];
  }
}

/** Exposed for tests / debugging. Resets the in-memory cache so the next
 *  call re-runs the selector. */
export function clearWikiSelectorCache(): void {
  cache.clear();
}

/** Soft cap on injected wiki text. Beyond this, we truncate the last
 *  page to fit rather than drop it entirely — partial context still
 *  beats "none of this topic" when the selector already flagged it. */
const WIKI_INJECT_BUDGET = 8 * 1024;

/**
 * High-level entry for the chat pipeline: run the selector, read the
 * chosen pages, and format them as an injectable `<wiki_context>` block.
 * Returns `null` when nothing relevant was selected or the selector
 * failed. Exposes the selected page list through the optional second
 * return so the chat UI can surface a "Wiki: N pages injected" chip.
 */
export async function buildWikiContext(query: string): Promise<{
  block: string;
  pages: WikiPage[];
} | null> {
  const selected = await selectRelevantWikiPages(query);
  if (selected.length === 0) return null;

  const contents = await readPageContents(selected);
  if (contents.length === 0) return null;

  const block = formatWikiBlock(contents);
  return { block, pages: selected };
}

async function readPageContents(pages: WikiPage[]): Promise<WikiPageContents[]> {
  const out: WikiPageContents[] = [];
  for (const p of pages) {
    try {
      const c = await invoke<WikiPageContents>('read_wiki_page', {
        relPath: p.relPath,
      });
      out.push(c);
    } catch (err) {
      console.warn(`read_wiki_page failed for ${p.relPath}`, err);
    }
  }
  return out;
}

function formatWikiBlock(contents: WikiPageContents[]): string {
  const segments: string[] = [];
  let used = 0;
  for (const c of contents) {
    const header = `### ${c.relPath}\n`;
    const remaining = WIKI_INJECT_BUDGET - used - header.length;
    if (remaining <= 200) break; // not enough room for a useful slice
    const body =
      c.content.length > remaining
        ? c.content.slice(0, remaining - 40) + '\n…[truncated]'
        : c.content;
    segments.push(header + body.trim());
    used += header.length + body.length;
  }
  if (segments.length === 0) return '';
  return `<wiki_context>\n${segments.join('\n\n---\n\n')}\n</wiki_context>`;
}
