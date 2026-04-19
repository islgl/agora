import type { ConversationMode } from '@/types';

/**
 * Shared parser for leading `/cmd` tokens on a user prompt. Used by both the
 * immediate-send path in `ChatInput` and the queued-send path in
 * `QueuedChips`, so `/plan write tests` behaves the same whether the user
 * sent it live or popped it off the queue minutes later.
 *
 * Only mode-switch commands are recognized by the parser (`/chat`, `/plan`,
 * `/execute`); those get intercepted, flip the conversation mode, and pass
 * the remainder (if any) to the model. Every other slash command in
 * `SLASH_COMMANDS` is **UI-only** — the menu expands its
 * `prompt` into the textarea on pick, the user hits Enter, and the model
 * fulfils it via whatever tool chain it already has. No new parser logic,
 * no Rust-side dispatch. Treat these as autocomplete shortcuts for common
 * natural-language requests.
 */
export const SLASH_MODE: Record<string, ConversationMode> = {
  '/chat': 'chat',
  '/plan': 'plan',
  '/execute': 'execute',
};

/** One entry in the slash-command autocomplete menu. `prompt`, when
 *  present, is what `pickSlashCommand` inserts into the textarea in
 *  place of the bare slash token — turning a one-word trigger into a
 *  full natural-language request for the model. Argument-taking
 *  commands (e.g. `/open <folder>`) leave `prompt` unset so the user
 *  can type the argument inline. */
export interface SlashCommandSpec {
  command: string;
  description: string;
  prompt?: string;
}

export const SLASH_COMMANDS: SlashCommandSpec[] = [
  // Mode switches (parser-handled — see parseSlashMode below).
  { command: '/chat', description: 'Switch to chat mode' },
  { command: '/plan', description: 'Switch to plan mode (readonly)' },
  {
    command: '/execute',
    description: 'Switch to execute mode (auto-allow writes)',
  },
  // Personal-assistant shortcuts (UI prefills — the model fulfils via
  // its existing tools). Keep descriptions short; the expanded prompt
  // carries the detail.
  {
    command: '/brand',
    description: 'Summarize all Brand Layer files',
    prompt:
      'Give me a quick summary of my Brand Layer — what SOUL, USER, TOOLS, MEMORY, and AGENTS currently say about me, one short paragraph each.',
  },
  {
    command: '/memory',
    description: 'Show MEMORY.md contents',
    prompt: "Show me what's in my MEMORY.md right now.",
  },
  {
    command: '/wiki',
    description: 'List wiki pages',
    prompt: 'List all my wiki pages, grouped by category.',
  },
  {
    command: '/raw',
    description: 'Show raw-inbox status',
    prompt:
      "Show me what's sitting in my raw inbox — which files are queued for ingest and which formats are supported.",
  },
  {
    command: '/dream',
    description: 'Run Dreaming and review candidates',
    prompt:
      'Run Dreaming now and show me the candidate memories. I will tell you which to save.',
  },
  {
    command: '/open',
    description: 'Open an Agora folder (e.g. /open raw)',
    // No prompt: arg-taking. User types `/open raw`, sends as-is,
    // model picks up the open_agora_folder tool.
  },
];

export interface ParsedSlash {
  /** Mode to switch into, or null when the text has no mode-switch prefix. */
  mode: ConversationMode | null;
  /** Text that should be forwarded to the model after the mode switch. */
  remainder: string;
}

export function parseSlashMode(text: string): ParsedSlash {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\/\S+)(?:\s+([\s\S]+))?$/);
  if (!match) return { mode: null, remainder: trimmed };
  const mode = SLASH_MODE[match[1].toLowerCase()] ?? null;
  if (!mode) return { mode: null, remainder: trimmed };
  return { mode, remainder: match[2]?.trim() ?? '' };
}
