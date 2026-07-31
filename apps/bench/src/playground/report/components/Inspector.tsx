import type { FC } from 'react';

import { Braces, CircleCheck, FileDiff, HeartPulse, TerminalSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { LabPolicyResult } from '../../modules/core';

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
    <section className="lab-panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Braces className="size-4 text-emerald-600 dark:text-emerald-400" />
          {t('inspector.title')}
        </div>
        {result === undefined ? (
          <Badge variant="outline">{t('report.awaiting')}</Badge>
        ) : (
          <Badge variant="secondary">{result.policyId}</Badge>
        )}
      </div>
      <div className={`grid divide-y ${compact ? 'grid-cols-1' : 'lg:grid-cols-4 lg:divide-x lg:divide-y-0'}`}>
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
            <article key={row.id} className={compact ? 'min-h-0 p-3' : 'min-h-32 p-4'}>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Icon className="size-3.5" />
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
