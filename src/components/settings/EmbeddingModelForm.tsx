import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/store/settingsStore';
import type { EmbeddingConfig } from '@/types';

interface EmbeddingModelFormProps {
  existing?: EmbeddingConfig;
  onClose: () => void;
}

const INPUT_CLASS =
  'rounded-xl border-border bg-card text-foreground ' +
  'focus-visible:border-ring focus-visible:ring-0 ' +
  'placeholder:text-muted-foreground';

export function EmbeddingModelForm({ existing, onClose }: EmbeddingModelFormProps) {
  const { addEmbeddingConfig, updateEmbeddingConfig } = useSettingsStore();
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    model: existing?.model ?? '',
    providerId: existing?.providerId ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.model.trim()) {
      return;
    }
    const payload = {
      name: form.name,
      provider: 'openai' as const,
      model: form.model,
      providerId: form.providerId.trim(),
    };
    if (existing) {
      await updateEmbeddingConfig({ ...existing, ...payload });
    } else {
      await addEmbeddingConfig(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="emb-name" className="text-sm text-muted-foreground">
          Display name
        </Label>
        <Input
          id="emb-name"
          type="text"
          placeholder="OpenAI Small"
          required
          className={INPUT_CLASS}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emb-model" className="text-sm text-muted-foreground">
          Model ID
        </Label>
        <Input
          id="emb-model"
          type="text"
          placeholder="text-embedding-3-small"
          required
          className={INPUT_CLASS}
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="emb-provider-id"
          className="text-sm text-muted-foreground"
        >
          Gateway Provider ID
        </Label>
        <Input
          id="emb-provider-id"
          type="text"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="tongyi / openai / qwen …"
          className={INPUT_CLASS}
          value={form.providerId}
          onChange={(e) =>
            setForm((f) => ({ ...f, providerId: e.target.value }))
          }
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Sent as <code>X-Model-Provider-Id</code> to route the request
          inside your gateway. Leave blank for a plain OpenAI endpoint.
        </p>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        API key + base URL live in the
        <span className="font-medium"> Providers </span>
        tab.
      </p>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground
                     hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm text-primary-foreground bg-primary
                     hover:bg-primary/90 transition-colors"
          style={{ boxShadow: '0 0 0 1px var(--primary)' }}
        >
          {existing ? 'Save' : 'Add embedding model'}
        </button>
      </div>
    </form>
  );
}
