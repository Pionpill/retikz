import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { useComparisonStore } from '@/store/useComparisonStore';

import { type ComparisonTarget, ComparisonTargetLabelKeys, isComparisonTarget } from './targets';

/** 可选对照块 props。 */
export type ComparisonProps = {
  /** 顶部显示的可选图标。 */
  icon?: ReactNode;
  /** 对照对象。 */
  target: ComparisonTarget;
  /** 对照块标题。 */
  title: string;
  /** 对照内容。 */
  children: ReactNode;
};

/** 可选对照块：按用户启用的 target 显示 TikZ / Recharts / shadcn 等对照内容。 */
export const Comparison: FC<ComparisonProps> = props => {
  const { icon, target, title, children } = props;
  const { t } = useTranslation();
  const isVisible = useComparisonStore(state => (isComparisonTarget(target) ? state.visibleTargets[target] : false));

  if (!isComparisonTarget(target) || !isVisible) return null;

  const targetLabel = t(ComparisonTargetLabelKeys[target]);

  return (
    <aside
      data-comparison-target={target}
      className={cn(
        'my-6 rounded-lg border bg-muted/60 px-4 py-3 text-sm text-muted-foreground',
        '[&>:last-child]:mb-0',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
        <span className="rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {targetLabel}
        </span>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_pre]:my-3">{children}</div>
    </aside>
  );
};
