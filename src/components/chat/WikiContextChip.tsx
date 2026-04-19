import { BookOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWikiStore } from '@/store/wikiStore';

interface Props {
  conversationId: string | null;
}

/**
 * In-chat chip showing which Wiki pages the selector injected on the
 * last turn. Hidden when nothing was injected — silence is the common
 * case and an empty chip is noise.
 */
export function WikiContextChip({ conversationId }: Props) {
  const injected = useWikiStore((s) =>
    conversationId ? s.lastInjected[conversationId] : undefined,
  );

  if (!conversationId || !injected || injected.length === 0) return null;

  const label = injected.length === 1
    ? 'Wiki · 1 page injected'
    : `Wiki · ${injected.length} pages injected`;

  return (
    <Tooltip>
      <TooltipTrigger
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                   bg-card text-muted-foreground cursor-default"
        style={{ boxShadow: '0 0 0 1px var(--border)' }}
      >
        <BookOpen className="size-3.5" />
        <span>{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-[11px] space-y-1">
          {injected.map((p) => (
            <div key={p.relPath}>
              <span className="font-medium">{p.title}</span>
              <span className="text-muted-foreground"> — {p.relPath}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
