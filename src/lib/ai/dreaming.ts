import { invoke } from '@tauri-apps/api/core';
import { generateText } from 'ai';
import { useSettingsStore } from '@/store/settingsStore';
import { useBrandStore } from '@/store/brandStore';
import { modelForConfig } from './providers';

/**
 * Phase 6 · Dreaming.
 *
 * Reads yesterday's conversation log + the current MEMORY.md, asks the
 * active model to distill candidate memories worth preserving, and
 * writes the result to ~/.agora/dreams/YYYY-MM-DD.json for the user
 * to accept or reject via Settings → Dreams.
 *
 * The heuristic is intentionally conservative — false positives (things
 * that look like memories but aren't) are much worse than false
 * negatives (missed memories the user can add later by hand).
 */

export type DreamTarget = 'USER' | 'TOOLS' | 'SOUL' | 'MEMORY';

export interface DreamCandidate {
  target: DreamTarget;
  content: string;
  justification?: string;
}

export interface DreamFile {
  date: string;
  candidates: DreamCandidate[];
  trimmedMemoryMd?: string;
  generatedAt: number;
}

/** Trigger a Dreaming run for the given date (YYYY-MM-DD; default = yesterday).
 *  Returns the produced DreamFile, or null when there's nothing to distill. */
export async function runDreaming(date?: string): Promise<DreamFile | null> {
  const target = date ?? yesterdayIsoDate();

  const settings = useSettingsStore.getState();
  const modelConfig = settings.modelConfigs.find(
    (m) => m.id === settings.activeModelId,
  );
  if (!modelConfig) {
    throw new Error('No active model configured; configure one in Settings → Models first.');
  }
  if (!settings.globalSettings.apiKey.trim()) {
    throw new Error('No API key set; add one in Settings → Providers first.');
  }

  const logResp = await invoke<{ date: string; content: string }>('read_daily_log', {
    date: target,
  });
  if (!logResp.content.trim()) {
    return null;
  }

  const brand = useBrandStore.getState().payload;
  const memoryMd = brand.memory.content;

  const resolved = settings.resolveModelConfig(modelConfig);
  const promptParts = [
    "You are Agora's Dreaming pass. Read the previous day's conversation log and the user's current MEMORY.md. Identify items worth long-term storage, return them as STRICT JSON.",
    '',
    'Three rules:',
    '1. Candidates must be durable — preferences, stable facts, project state that outlives the day. NOT one-off answers, code, or conversational filler.',
    '2. Route each candidate to a target file:',
    '   - USER: identity, timezone, role',
    '   - TOOLS: tech stack, tooling preferences',
    '   - SOUL: communication / style preferences',
    '   - MEMORY: everything else durable',
    '3. Optionally propose a trimmed version of MEMORY.md — only if it has obvious duplication / stale entries. Leave trimmedMemoryMd out otherwise.',
    '',
    'Return JSON ONLY, matching this shape:',
    '{"candidates": [{"target":"USER|TOOLS|SOUL|MEMORY","content":"...","justification":"..."}], "trimmedMemoryMd":"..."}',
    '',
    'Current MEMORY.md:',
    memoryMd || '(empty)',
    '',
    'Conversation log:',
    logResp.content,
  ];
  const prompt = promptParts.join('\n');

  const result = await generateText({
    model: modelForConfig(resolved),
    prompt,
    maxOutputTokens: 2000,
  });

  const parsed = parseDream(result.text);
  if (!parsed) {
    throw new Error('Dreaming output was not valid JSON');
  }

  const dream: DreamFile = {
    date: target,
    candidates: parsed.candidates,
    trimmedMemoryMd: parsed.trimmedMemoryMd,
    generatedAt: Math.floor(Date.now() / 1000),
  };

  await invoke('write_dream', { dream });
  await invoke('mark_dreaming_ran');
  return dream;
}

/** Accept one candidate — writes it into the appropriate Brand file via
 *  `append_to_memory`. Returns the result object so the caller can pair
 *  it with a toast. */
export async function acceptCandidate(c: DreamCandidate): Promise<{
  written: boolean;
  file: string;
  reason: string | null;
}> {
  const file = `${c.target}.md`;
  return invoke('append_to_memory', {
    file,
    content: c.content,
    section: undefined,
  });
}

export async function discardDream(date: string): Promise<boolean> {
  return invoke<boolean>('discard_dream', { date });
}

export async function listDreamDates(): Promise<string[]> {
  return invoke<string[]>('list_dream_dates');
}

export async function readDream(date: string): Promise<DreamFile | null> {
  return invoke<DreamFile | null>('read_dream', { date });
}

/** Check whether the scheduler thinks Dreaming should auto-run right now. */
export async function shouldRun(): Promise<boolean> {
  try {
    return await invoke<boolean>('dreaming_should_run');
  } catch (err) {
    console.warn('dreaming_should_run failed', err);
    return false;
  }
}

function parseDream(raw: string): {
  candidates: DreamCandidate[];
  trimmedMemoryMd?: string;
} | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as {
      candidates?: unknown;
      trimmedMemoryMd?: unknown;
    };
    const cands = Array.isArray(parsed.candidates)
      ? parsed.candidates.flatMap((c): DreamCandidate[] => {
          if (!c || typeof c !== 'object') return [];
          const r = c as Record<string, unknown>;
          const target = typeof r.target === 'string' ? r.target.toUpperCase() : '';
          const content = typeof r.content === 'string' ? r.content.trim() : '';
          const just =
            typeof r.justification === 'string' ? r.justification.trim() : '';
          if (!['USER', 'TOOLS', 'SOUL', 'MEMORY'].includes(target)) return [];
          if (!content) return [];
          return [
            {
              target: target as DreamTarget,
              content,
              justification: just || undefined,
            },
          ];
        })
      : [];
    return {
      candidates: cands,
      trimmedMemoryMd:
        typeof parsed.trimmedMemoryMd === 'string'
          ? parsed.trimmedMemoryMd
          : undefined,
    };
  } catch {
    return null;
  }
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
