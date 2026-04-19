import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { MaskedKeyInput } from './MaskedKeyInput';
import { SettingsPage } from './SettingsPage';
import { SettingsSection, SettingsSubsection } from './SettingsSection';
import type { GlobalSettings, ThinkingEffort } from '@/types';

const THINKING_OPTIONS: {
  value: ThinkingEffort;
  label: string;
  hint: string;
}[] = [
  { value: 'off', label: 'Off', hint: 'No extended reasoning. Cheapest, fastest.' },
  { value: 'low', label: 'Low', hint: '~2k reasoning tokens.' },
  { value: 'medium', label: 'Medium', hint: '~8k reasoning tokens.' },
  { value: 'high', label: 'High', hint: '~16k reasoning tokens.' },
  {
    value: 'max',
    label: 'Max',
    hint: '48k+ budget (Anthropic) / dynamic (Gemini). OpenAI caps at "high".',
  },
];

const EMBEDDING_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'text-embedding-3-small' },
  { value: 'gemini', label: 'Gemini', defaultModel: 'text-embedding-004' },
] as const;

const INPUT_CLASS =
  'rounded-xl border-border bg-card text-foreground ' +
  'focus-visible:border-ring focus-visible:ring-0 ' +
  'placeholder:text-muted-foreground';

export function CapabilitiesForm() {
  const { globalSettings, saveGlobalSettings } = useSettingsStore();
  const [form, setForm] = useState<GlobalSettings>(globalSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(globalSettings);
  }, [globalSettings]);

  const dirty =
    form.webSearchEnabled !== globalSettings.webSearchEnabled ||
    form.tavilyApiKey !== globalSettings.tavilyApiKey ||
    form.thinkingEffort !== globalSettings.thinkingEffort ||
    form.autoMemoryEnabled !== globalSettings.autoMemoryEnabled ||
    form.embeddingProvider !== globalSettings.embeddingProvider ||
    form.embeddingModel !== globalSettings.embeddingModel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveGlobalSettings(form);
      toast.success('Capabilities saved');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SettingsPage
        title="Capabilities"
        description="Feature toggles that change what the agent can do — web access, extended reasoning budgets, automatic memory extraction."
      >
        <SettingsSection
          title="Web search"
          description="Lets the model ground answers in fresh web results. Prefers the provider's native tool; Tavily is a gateway-safe fallback."
        >
          <div
            className="flex items-start gap-3 p-3 rounded-xl bg-card"
            style={{ boxShadow: '0 0 0 1px var(--border)' }}
          >
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm text-foreground">Enable web search</div>
              <div className="text-xs text-muted-foreground">
                Toggle per-turn from the globe button in the chat input.
              </div>
            </div>
            <Toggle
              checked={form.webSearchEnabled}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, webSearchEnabled: checked }))
              }
              className="mt-0.5"
            />
          </div>

          <SettingsSubsection
            title="Tavily fallback"
            description="Used only when the provider's native search isn't available (e.g. a gateway strips Anthropic's tool). Leave blank to disable."
          >
            <Label
              htmlFor="tavilyApiKey"
              className="sr-only"
            >
              Tavily API key
            </Label>
            <MaskedKeyInput
              id="tavilyApiKey"
              placeholder="tvly-…"
              className={INPUT_CLASS}
              value={form.tavilyApiKey}
              onChange={(next) =>
                setForm((f) => ({ ...f, tavilyApiKey: next }))
              }
            />
          </SettingsSubsection>
        </SettingsSection>

        <SettingsSection
          title="Extended thinking"
          description="How much internal reasoning the model can produce before answering. Only supported models use this; others respond normally (no error)."
        >
          <div className="grid grid-cols-5 gap-1.5">
            {THINKING_OPTIONS.map((opt) => {
              const active = form.thinkingEffort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, thinkingEffort: opt.value }))
                  }
                  title={opt.hint}
                  className={`px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  style={
                    active
                      ? { boxShadow: '0 0 0 1px var(--primary)' }
                      : { boxShadow: '0 0 0 1px var(--border)' }
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {THINKING_OPTIONS.find((o) => o.value === form.thinkingEffort)?.hint}
          </p>
        </SettingsSection>

        <SettingsSection
          title="Auto memory"
          description="After each turn, a lightweight model pass extracts 0–3 durable facts and stores them in a local vector index. Disable to keep only the memories you explicitly ask Agora to remember."
        >
          <div
            className="flex items-start gap-3 p-3 rounded-xl bg-card"
            style={{ boxShadow: '0 0 0 1px var(--border)' }}
          >
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm text-foreground">
                Enable auto-extraction
              </div>
              <div className="text-xs text-muted-foreground">
                Runs in the background per turn. Recall at turn start keeps
                working either way — disabling only stops new writes.
              </div>
            </div>
            <Toggle
              checked={form.autoMemoryEnabled}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, autoMemoryEnabled: checked }))
              }
              className="mt-0.5"
            />
          </div>

          <SettingsSubsection
            title="Embedding model"
            description="Used for both the extractor and Top-K recall. Ask Agora in chat to audit or prune specific entries — there is no Memory tab."
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Provider
                </Label>
                <select
                  value={form.embeddingProvider}
                  onChange={(e) => {
                    const next = e.target.value;
                    const opt = EMBEDDING_PROVIDER_OPTIONS.find(
                      (o) => o.value === next,
                    );
                    setForm((f) => ({
                      ...f,
                      embeddingProvider: next,
                      embeddingModel: opt?.defaultModel ?? f.embeddingModel,
                    }));
                  }}
                  className="w-full h-9 rounded-xl px-2 text-xs bg-card"
                  style={{ boxShadow: '0 0 0 1px var(--border)' }}
                >
                  {EMBEDDING_PROVIDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Model
                </Label>
                <input
                  type="text"
                  value={form.embeddingModel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, embeddingModel: e.target.value }))
                  }
                  spellCheck={false}
                  className="w-full h-9 rounded-xl px-2 text-xs bg-card"
                  style={{ boxShadow: '0 0 0 1px var(--border)' }}
                />
              </div>
            </div>
          </SettingsSubsection>
        </SettingsSection>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="px-4 py-2 rounded-xl text-sm text-primary-foreground bg-primary
                       hover:bg-primary/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 0 0 1px var(--primary)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </SettingsPage>
    </form>
  );
}
