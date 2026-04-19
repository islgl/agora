import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * H2 section inside a `SettingsPage`. Heading is always in the primary
 * foreground color — hierarchy comes from size/weight, not from fading
 * the label.
 */
export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

interface SettingsSubsectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * H3 sub-grouping. Uppercase small caption keeps the hierarchy visible
 * without demanding attention, but it stays in the primary foreground
 * color — no muted grey headings.
 */
export function SettingsSubsection({
  title,
  description,
  children,
}: SettingsSubsectionProps) {
  return (
    <div className="space-y-2 pl-4 border-l border-border/60">
      <div className="space-y-0.5">
        <h3 className="text-[11px] uppercase tracking-[0.08em] text-foreground font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
