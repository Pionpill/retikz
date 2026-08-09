import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import type { DocDifficultyValue } from '@/modules/docs/data';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';

import { DocDifficultyVisuals } from './doc-difficulty-config';

export type DocDifficultyDotProps = {
  /** 叶子文档难度；空值不渲染。 */
  difficulty?: DocDifficultyValue;
};

/** 侧栏叶子文档的难度圆点。 */
export const DocDifficultyDot: FC<DocDifficultyDotProps> = props => {
  const { difficulty } = props;
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
          className="pointer-events-none ml-1 inline-flex size-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
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
