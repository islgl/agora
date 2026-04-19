# Changelog

All notable changes to Agora will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Personal Assistant Layers** — Agora is no longer just a chat front-end over a tool runtime. Five new on-disk layers under `~/.agora/` shape the agent's identity and knowledge:
  - **Brand Layer** (`config/`): five Markdown files — `SOUL.md` (personality), `USER.md` (identity), `TOOLS.md` (tech preferences), `MEMORY.md` (long-term facts), `AGENTS.md` (system-owned safety rules). Seeded from `src-tauri/templates/` on first launch, injected into every system prompt as `<brand>` XML blocks (`<agents>` > `<soul>` > `<user>` > `<tools>`). User maintains these through chat via `list_brand_files` / `read_brand_file` / `append_brand_file` / `replace_brand_file` / `delete_brand_line` synth tools — no Settings UI. A Rust-side secret denylist refuses to persist API keys / tokens / hex-blob secrets, and the AGENTS.md write path is blocked entirely.
  - **LLM-Wiki Layer** (`wiki/`): structured knowledge pages under `concepts/`, `projects/`, `domains/` with YAML frontmatter (title, tags, category, summary, sources, updated_at). A per-turn selector picks relevant pages and injects them into the system prompt; the chat header shows a `WikiContextChip` listing what got pulled in. Main agent gets full CRUD (`list_wiki_pages` / `read_wiki_page` / `write_wiki_page` / `update_wiki_index` / `delete_wiki_page`); subagents only read.
  - **Raw Layer** (`raw/`): a drop-inbox for articles / papers / notes. A `notify`-backed file watcher emits `wiki-ingest-request` events, a background subagent turns each drop into a Wiki page (PDF support via `pdf-extract`). `list_raw_files` lets the main agent answer "what's in my inbox?"; `open_agora_folder` hands the user a Finder window via `opener:allow-open-path`.
  - **Auto Memory** (SQLite `memory_auto` table + HNSW in-RAM index): a post-turn extractor embeds candidate facts via OpenAI or Gemini embeddings (configurable via `embedding_provider` / `embedding_model` / `auto_memory_enabled` global settings) and stores them as packed `f32` blobs. A semantic recall block rides above the Wiki block in the system prompt. Main agent curates via `list_auto_memories` / `delete_auto_memory` — no Settings UI. HNSW rehydrates from SQLite on startup.
  - **Dreaming** (`dreams/`): nightly distillation job. An opportunistic trigger on app mount (2-6 AM local, >20h since last run) reads the day's turn log from `logs/` and produces candidate Brand/Memory edits as JSON under `dreams/YYYY-MM-DD.json`. User reviews via `list_dreams` / `read_dream` / `discard_dream` and accepts candidates through the existing `append_brand_file` tool.
- **Mid-turn user interrupts** — text-only queued messages now auto-inject into the next `tool_result` as a `<user-interrupt>` block instead of waiting for a manual ➤ click. A new `user_interrupt` message part records what the user said and when, rendered inline in the transcript as a muted right-aligned bubble with timestamp. Stream-end auto-dispatches any remaining queued messages (originally manual-only — the extra click was busywork); attachment-bearing messages still need ➤ because they can't ride a text-only tool_result. Clicking ➤ mid-stream cancels and re-sends. Chip color reflects state (primary tint = will auto-inject, amber = stuck on attachments, neutral = manual).
- **Constitutional self-check** — every turn prepends a 3-item `<constitution>` block (safety / privacy / irreversibility) below `<brand>` so `<agents>` rules are in scope. Three items on purpose: Anthropic's practical guidance is that CAI degrades past ~5 rules.
- **Remember-intent nudge** — bilingual trigger phrases ("记住", "请记住", "from now on", "remember that", …) mark the turn so the model decides whether to call `append_brand_file`. Never routes on keywords directly — too many false positives in ordinary chat.
- **Type-ahead message queue** — the composer no longer locks during a running stream. Submissions while a response is in flight land on a per-conversation pending queue rendered as chips above the composer. Drain is manual (➤ per chip), so an assistant that ends with an inline clarification question ("do you mean A or B?") can't silently eat a queued follow-up. `/plan`, `/execute`, etc. re-parse at send time, not at queue time. Stream cancel leaves the queue intact; deleting the conversation clears it.
- **Push-to-main CHANGELOG guard** — `.claude/hooks/require-changelog-on-push.sh` registered as a Claude Code PreToolUse hook via `.claude/settings.json`. Blocks `git push … main` when none of the pending commits touched `CHANGELOG.md`, keeping release notes in lockstep with the tree.

### Changed

- **Settings page scaffolding** — new `SettingsPage` / `SettingsSection` primitives replace ad-hoc `SectionDivider` layouts across General / Capabilities / Hooks / Permissions / Providers / MCP / Models / Skills forms. Uniform title + description + body spacing; no more drift between tabs.
- **`cancel()` unblocks the ask_user gate** — stopping a stream while a clarification prompt is up now resolves every in-flight `ask_user` promise with a `[cancelled]` sentinel and clears the visible prompt, so the next turn doesn't inherit an orphaned gate.

### Changed

- **Move logo assets to repo-root `assets/`** — `./assets/logo-{light,dark}.png` are now the canonical paths referenced by the README header.
- **`docs/` is now local-only** — internal design notes, roadmap, and TODO live outside of git (`docs/` is in `.gitignore`). The README no longer advertises a Documentation section.
- **Auto conversation title options** in Settings → General collapse into a 3-column segmented row (was a vertical stack of wide cards). Full hints moved to the native hover tooltip — saves ~3 lines of vertical space.
- **API key input never shows plaintext** — `MaskedKeyInput` now uses `type="password"` when focused, so the value is dot-masked live as the user types/pastes instead of revealing the raw string. Blurred state is unchanged (fixed 15-dot preview).

### Fixed

- **Queue-chip selector infinite loop** — `QueuedChips` returned a fresh `[]` on every render when the current conversation had no queue, tripping React's "getSnapshot should be cached" guard and white-screening the app on conversation open. Now uses a stable `EMPTY_QUEUE` reference.
- **Active model persists across restarts** — clicking *Use* in Settings → Models now writes the selected model id into `global_settings.active_model_id` (new column), and startup reads it back before the "pick a fallback" logic runs. Previously, *Use* was in-memory-only and a restart fell back to the first model in the list.

## [0.1.0-alpha.1] — 2026-04-19

### Changed

- **Ad-hoc sign the macOS bundle** (`bundle.macOS.signingIdentity = "-"`) so Gatekeeper no longer rejects the `.dmg` with the misleading "damaged" message. Users on a fresh download only need `right-click → Open` once; the `xattr -dr com.apple.quarantine` workaround is no longer required.

## [0.1.0-alpha] — 2026-04-19

First public preview. Everything stored locally under `~/.agora/`.

### Added

- **Chat runtime** on top of the Vercel AI SDK with Anthropic, OpenAI, and Google providers; per-model configuration and live test.
- **Built-in agent tools** (Rust): `read_file`, `write_file`, `edit_file`, `glob`, `grep`, `bash`, `bash_background`, `read_task_output`, `stop_task` — all scoped to a workspace root.
- **MCP support** — connect external Model Context Protocol servers, persisted and reconnected on launch.
- **Skills** — load markdown-based skill packs from `~/.agora/skills/`; optional script execution gated by a global toggle.
- **Conversation branching** — switch active leaves without losing alternative histories.
- **Agent capabilities** — approval prompts with per-tool allow rules, auto-approve for read-only tools, structured todos, conversation modes (including plan mode), subagents, lifecycle hooks.
- **Export & share** — Markdown and PDF export, plus a share-conversation command.
- **Search** — full-text search across conversations.
- **Default workspace root** — `~/.agora/workspace` applied on first launch so FS/Bash tools have scope without setup; editable via **Settings → General** (type/paste a path or use the directory picker).
- **Legacy-data migration** — one-shot move from `~/Library/Application Support/com.agora.app/` to `~/.agora/` on upgrade.

### Known limitations

- macOS build only; binaries are unsigned (expect a Gatekeeper prompt on first launch).
- No auto-update channel yet — grab new versions from [Releases](https://github.com/islgl/agora/releases).
- Cross-platform builds (Windows / Linux) are planned once CI is wired up.

[Unreleased]: https://github.com/islgl/agora/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/islgl/agora/compare/v0.1.0-alpha...v0.1.0-alpha.1
[0.1.0-alpha]: https://github.com/islgl/agora/releases/tag/v0.1.0-alpha
