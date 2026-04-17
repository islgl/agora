import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { ProviderIcon } from './ProviderIcon';

export function ModelSelector() {
  const { modelConfigs, activeModelId, setActiveModel } = useSettingsStore();
  const activeModel = modelConfigs.find((m) => m.id === activeModelId);

  if (modelConfigs.length === 0) {
    return (
      <span className="text-xs text-muted-foreground px-1">No models configured</span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground
                   hover:text-foreground hover:bg-accent transition-colors max-w-[14rem]"
      >
        {activeModel && (
          <ProviderIcon provider={activeModel.provider} className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{activeModel?.name ?? 'Select model'}</span>
        <ChevronDown className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem] max-w-[22rem]">
        {modelConfigs.map((m) => {
          const active = m.id === activeModelId;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => setActiveModel(m.id)}
              className={`flex items-center gap-2 whitespace-nowrap ${
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              <ProviderIcon provider={m.provider} className="size-3.5 shrink-0" />
              <span className="truncate flex-1">{m.name}</span>
              <Check
                className={`size-3 shrink-0 text-primary ${active ? 'opacity-100' : 'opacity-0'}`}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
