import type { FC, RefObject } from 'react';

import { Boxes, ScanSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { LabState } from '../lab-state';

import { LabStatus } from '../lab-state';

/** 真实 renderer 舞台属性 */
export type RenderStageProps = Readonly<{
  state: LabState;
  previewHostRef: RefObject<HTMLDivElement>;
}>;

/** 承载 Preview 模式真实 SVG / Canvas host 的舞台 */
export const RenderStage: FC<RenderStageProps> = props => {
  const { state, previewHostRef } = props;
  const { t } = useTranslation();
  return (
    <section className="lab-panel flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScanSearch className="size-4 text-violet-500" />
          {t('stage.title')}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{state.backend.toUpperCase()}</Badge>
          <Badge variant={state.status === LabStatus.Success ? 'secondary' : 'outline'}>
            {t(`status.${state.status}`)}
          </Badge>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
        <div className="lab-grid absolute inset-0 opacity-30" />
        <div
          ref={previewHostRef}
          className="lab-preview absolute inset-4 z-10 overflow-hidden rounded-xl border bg-background"
        />
        {state.status === LabStatus.Idle ? (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-center">
            <div>
              <Boxes className="mx-auto size-9 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">{t('stage.ready')}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{t('stage.description')}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
