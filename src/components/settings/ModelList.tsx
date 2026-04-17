import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { ModelForm } from './ModelForm';
import { ProviderIcon } from './ProviderIcon';
import type { ModelConfig } from '@/types';

export function ModelList() {
  const { modelConfigs, activeModelId, deleteModelConfig, setActiveModel } =
    useSettingsStore();
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (isAdding || editingModel) {
    return (
      <ModelForm
        existing={editingModel ?? undefined}
        onClose={() => {
          setIsAdding(false);
          setEditingModel(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {modelConfigs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No models configured. Add one to start chatting.
        </p>
      ) : (
        modelConfigs.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card min-w-0"
            style={{ boxShadow: '0 0 0 1px var(--border)' }}
          >
            <ProviderIcon provider={m.provider} className="size-5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate min-w-0">
                  {m.name}
                </span>
                {m.id === activeModelId && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate" title={m.model}>
                {m.model}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {m.id !== activeModelId && (
                <button
                  onClick={() => setActiveModel(m.id)}
                  className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground
                             hover:bg-accent transition-colors whitespace-nowrap"
                >
                  Use
                </button>
              )}
              <button
                onClick={() => setEditingModel(m)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                           hover:bg-accent transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => deleteModelConfig(m.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive
                           hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
                   text-muted-foreground hover:text-foreground border border-dashed border-border
                   hover:border-ring-warm hover:bg-accent transition-colors"
      >
        <Plus className="size-3.5" />
        Add model
      </button>
    </div>
  );
}
