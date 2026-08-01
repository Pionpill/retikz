import type { FC, RefObject } from 'react';

import { CircleAlert, Cpu, DatabaseZap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { LabState } from '../lab-state';

import { RenderStage } from './RenderStage';

/** 测试预览工作区属性 */
export type RunViewProps = Readonly<{
  state: LabState;
  previewHostRef: RefObject<HTMLDivElement>;
}>;

/** 当前测试集的说明与真实渲染预览 */
export const RunView: FC<RunViewProps> = props => {
  const { state, previewHostRef } = props;
  const { t } = useTranslation();
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">{t('app.title')}</h1>
              <Badge variant="secondary">alpha.2</Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('app.description')}</p>
          </div>
          <div className="hidden items-center gap-2 text-[10px] text-muted-foreground lg:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5">
              <Cpu className="size-3 text-violet-500" />
              {t('config.local')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5">
              <DatabaseZap className="size-3 text-cyan-600 dark:text-cyan-400" />
              {t('config.baseline')} · {t('config.readOnly')}
            </span>
          </div>
        </div>

        {state.error === undefined ? null : (
          <div className="flex shrink-0 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <RenderStage state={state} previewHostRef={previewHostRef} />
        <p className="shrink-0 text-center text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
          {t('stage.evidence')}
        </p>
      </div>
    </main>
  );
};
