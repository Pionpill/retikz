import type { FC } from 'react';

import { Braces, CircleCheck, FileDiff, HeartPulse, TerminalSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { LabPolicyResult } from '../../modules/kernel';

/** Runtime Inspector 属性 */
export type InspectorProps = Readonly<{
  result?: LabPolicyResult;
  compact?: boolean;
}>;

const rows = [
  { id: 'trace', labelKey: 'inspector.trace', icon: TerminalSquare },
  { id: 'patch', labelKey: 'inspector.patch', icon: FileDiff },
  { id: 'diagnostics', labelKey: 'inspector.diagnostics', icon: HeartPulse },
  { id: 'lifecycle', labelKey: 'inspector.lifecycle', icon: CircleCheck },
] as const;

/** 在单屏中展示 trace、Patch、diagnostics 与生命周期 */
export const Inspector: FC<InspectorProps> = props => {
  const { result, compact = false } = props;
  const { t } = useTranslation();
  return (
    <section data-slot="lab-inspector" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Braces className="size-3.5" />
          </span>
          {t('inspector.title')}
        </div>
        {result === undefined ? (
          <Badge variant="outline">{t('report.awaiting')}</Badge>
        ) : (
          <Badge variant="secondary">{result.policyId}</Badge>
        )}
      </div>
      <div
        data-slot="lab-inspector-grid"
        className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'}`}
      >
        {rows.map(row => {
          const Icon = row.icon;
          const content = (() => {
            if (result === undefined) return t('inspector.noData');
            if (row.id === 'trace') {
              const record = result.trace.find(entry => entry.phase === 'update') ?? result.trace.at(0);
              return record === undefined
                ? t('inspector.noData')
                : t('inspector.traceRecord', {
                    owner: record.owner,
                    phase: record.phase,
                    outcome: record.outcome,
                    visited: record.visited,
                    reused: record.reused,
                  });
            }
            if (row.id === 'patch') {
              return result.patch === undefined
                ? t('inspector.noPatch')
                : t('inspector.patchSummary', {
                    count: result.patch.operationCount,
                    kinds: result.patch.kinds.join(', '),
                  });
            }
            if (row.id === 'diagnostics') {
              return result.diagnostics.length === 0 ? t('inspector.noDiagnostics') : result.diagnostics.join('\n');
            }
            return t('inspector.lifecycleUnavailable');
          })();
          return (
            <article
              key={row.id}
              data-slot="lab-inspector-card"
              className={`lab-panel ${compact ? 'min-h-0 p-3' : 'min-h-32 p-4'}`}
            >
              <div
                data-slot="lab-inspector-card-title"
                className="flex items-center gap-2 text-xs font-semibold text-foreground"
              >
                <Icon className="size-3.5 text-muted-foreground" />
                {t(row.labelKey)}
              </div>
              <pre
                className={`${compact ? 'mt-2' : 'mt-3'} whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground`}
              >
                {content}
              </pre>
            </article>
          );
        })}
      </div>
    </section>
  );
};
