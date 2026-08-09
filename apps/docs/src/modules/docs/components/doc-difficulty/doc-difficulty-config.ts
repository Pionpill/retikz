import type { LucideIcon } from 'lucide-react';

import { Frown, Meh, Smile } from 'lucide-react';

import type { I18nKey } from '@/modules/docs/data';
import type { DocDifficultyValue } from '@/modules/docs/data';

import { DocDifficulty } from '@/modules/docs/data';

/** 单个难度等级的共享视觉配置。 */
export type DocDifficultyVisualConfig = {
  Icon: LucideIcon;
  iconClassName: string;
  dotClassName: string;
  label: I18nKey;
};

/** 难度等级到 icon、颜色与本地化名称的唯一映射。 */
export const DocDifficultyVisuals: Record<DocDifficultyValue, DocDifficultyVisualConfig> = {
  [DocDifficulty.Beginner]: {
    Icon: Smile,
    iconClassName: 'text-green-600 dark:text-green-400',
    dotClassName: 'bg-green-500',
    label: 'difficulty.beginner',
  },
  [DocDifficulty.Advanced]: {
    Icon: Meh,
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
    dotClassName: 'bg-yellow-500',
    label: 'difficulty.advanced',
  },
  [DocDifficulty.Internals]: {
    Icon: Frown,
    iconClassName: 'text-red-600 dark:text-red-400',
    dotClassName: 'bg-red-500',
    label: 'difficulty.internals',
  },
};
