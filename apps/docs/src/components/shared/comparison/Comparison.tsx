import { X } from 'lucide-react';
import { type FC, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useComparisonStore } from '@/store/use-comparison-store';

import { ComparisonTargetLabelKeys, type ComparisonTargetValue, isComparisonTarget } from './targets';

/** 可选对照块 props。 */
export type ComparisonProps = {
  /** 顶部显示的可选图标。 */
  icon?: ReactNode;
  /** 对照对象。 */
  target: ComparisonTargetValue;
  /** 对照块标题。 */
  title: string;
  /** 对照内容。 */
  children: ReactNode;
};

/** 可选对照块：按用户启用的 target 显示 TikZ / Recharts / shadcn 等对照内容。 */
export const Comparison: FC<ComparisonProps> = props => {
  const { icon, target, title, children } = props;
  const { t } = useTranslation();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const isVisible = useComparisonStore(state => (isComparisonTarget(target) ? state.visibleTargets[target] : false));
  const setTargetVisible = useComparisonStore(state => state.setTargetVisible);

  if (!isComparisonTarget(target) || !isVisible) return null;

  const targetLabel = t(ComparisonTargetLabelKeys[target]);
  const closeLabel = t('comparison.close', { target: targetLabel });

  const handleConfirmClose = () => {
    setTargetVisible(target, false);
    setCloseDialogOpen(false);
  };

  return (
    <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
      <aside
        data-comparison-target={target}
        className={cn(
          'group relative my-6 rounded-lg border bg-muted/60 px-4 py-3 text-sm text-muted-foreground',
          '[&>:last-child]:mb-0',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={closeLabel}
          className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => setCloseDialogOpen(true)}
        >
          <X className="size-3" />
        </Button>
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-8">
          {icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
          <span className="rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {targetLabel}
          </span>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_pre]:my-3">{children}</div>
      </aside>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('comparison.closeTitle', { target: targetLabel })}</DialogTitle>
          <DialogDescription>{t('comparison.closeDescription', { target: targetLabel })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('comparison.cancel')}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirmClose}>
            {t('comparison.confirmClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
