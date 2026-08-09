import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import type { DocDifficultyValue } from '@/modules/docs/data';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { DocDifficultyVisuals } from './doc-difficulty-config';

export type DocDifficultyIndicatorProps = {
  /** 当前文档声明的阅读难度；空值不渲染。 */
  difficulty?: DocDifficultyValue;
};

/** 页头文档难度提示。 */
export const DocDifficultyIndicator: FC<DocDifficultyIndicatorProps> = props => {
  const { difficulty } = props;
  const { t } = useTranslation();

  if (difficulty === undefined) return null;

  const { Icon, iconClassName, label } = DocDifficultyVisuals[difficulty];
  const difficultyLabel = t(label);
  const tooltip = t('difficulty.pageTooltip', { difficulty: difficultyLabel });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={tooltip}
          data-doc-difficulty={difficulty}
          className="inline-flex size-7 shrink-0 items-center justify-center"
        >
          <Icon aria-hidden className={`size-4 ${iconClassName}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};
