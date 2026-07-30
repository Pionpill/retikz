import type { Dispatch, FC } from 'react';

import { Cpu, DatabaseZap, RotateCcw, TimerReset, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import type { LabState, LabStateAction } from '../lab-state';

import { LabActionType } from '../lab-state';

/** 详细配置 Sheet 属性 */
export type ConfigurationSheetProps = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
}>;

/** Bench 低频采样与环境配置 */
export const ConfigurationSheet: FC<ConfigurationSheetProps> = props => {
  const { state, dispatch } = props;
  const { t } = useTranslation();
  return (
    <Sheet
      open={state.detailsOpen}
      onOpenChange={open => dispatch({ type: open ? LabActionType.DetailsOpened : LabActionType.DetailsClosed })}
    >
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle>{t('config.title')}</SheetTitle>
              <SheetDescription>{t('config.description')}</SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('config.close')}
              onClick={() => dispatch({ type: LabActionType.DetailsClosed })}
            >
              <X />
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">{t('config.sampling')}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('config.samplingDescription')}</p>
            </div>
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TimerReset className="size-3.5" />
                {t('config.sampleRuns')}
              </span>
              <Select
                value={String(state.sampleRuns)}
                onValueChange={value => dispatch({ type: LabActionType.SampleRunsSelected, sampleRuns: Number(value) })}
              >
                <SelectTrigger aria-label={t('config.sampleRuns')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 12, 30, 60].map(value => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <RotateCcw className="size-3.5" />
                {t('config.warmupRuns')}
              </span>
              <Select
                value={String(state.warmupRuns)}
                onValueChange={value => dispatch({ type: LabActionType.WarmupRunsSelected, warmupRuns: Number(value) })}
              >
                <SelectTrigger aria-label={t('config.warmupRuns')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 4, 8].map(value => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </section>

          <section className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-semibold">{t('config.environment')}</h3>
            <div className="rounded-xl border bg-muted/30">
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Cpu className="size-4 text-violet-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{t('config.execution')}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('config.currentBrowser')}</p>
                </div>
                <Badge variant="secondary">{t('config.local')}</Badge>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <DatabaseZap className="size-4 text-cyan-600 dark:text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{t('config.baseline')}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('config.deterministicEvidence')}</p>
                </div>
                <Badge variant="outline">{t('config.readOnly')}</Badge>
              </div>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">{t('config.notice')}</p>
          </section>
        </div>

        <SheetFooter className="border-t">
          <Button variant="secondary" onClick={() => dispatch({ type: LabActionType.DetailsClosed })}>
            {t('config.done')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
