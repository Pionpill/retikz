import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';
import type { DocDifficultyValue } from '@/modules/docs/data';

import { DocDifficultyVisuals } from './doc-difficulty-config';

export type DocDifficultyDotProps = {
  /** 叶子文档难度；空值不渲染。 */
  difficulty?: DocDifficultyValue;
  /** 当前文档选中时始终显示圆点。 */
  isActive?: boolean;
};

/** 侧栏叶子文档的难度圆点。 */
export const DocDifficultyDot: FC<DocDifficultyDotProps> = props => {
  const { difficulty, isActive = false } = props;
  const { t } = useTranslation();

  if (difficulty === undefined) return null;

  const { dotClassName, label } = DocDifficultyVisuals[difficulty];
  const tooltip = t('difficulty.pageTooltip', { difficulty: t(label) });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={tooltip}
          data-doc-difficulty-slot={difficulty}
          className={cn(
            'ml-1 mr-1 size-4 shrink-0 items-center justify-center group-hover:inline-flex',
            isActive ? 'inline-flex' : 'hidden',
          )}
        >
          <span
            aria-hidden
            data-doc-difficulty-dot={difficulty}
            className={cn('size-1.5 shrink-0 rounded-full', dotClassName)}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};
