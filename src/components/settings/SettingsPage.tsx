import type { ReactNode } from 'react';

interface SettingsPageProps {
  title: string;
  description?: string;
  /** Pushed to the right of the title — typically a small action button or
   *  status pill. Use sparingly; most pages don't need it. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Top-level wrapper for a Settings tab. Renders the tab's title as a
 * serif heading matching the dialog title's aesthetic, an optional
 * description, and the children below. Gives every tab a consistent
 * visual anchor so the reader always knows what page they're on.
 */
export function SettingsPage({
  title,
  description,
  actions,
  children,
}: SettingsPageProps) {
  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <h1
            className="text-foreground text-lg leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="space-y-7">{children}</div>
    </div>
  );
}
