import type { DocDifficultyValue } from './types';

import { DocDifficulty } from './types';

/** 文档难度对应的阅读耗时系数。 */
export const DocDifficultyReadingCoefficient: Record<DocDifficultyValue, number> = {
  [DocDifficulty.Beginner]: 1,
  [DocDifficulty.Advanced]: 1.2,
  [DocDifficulty.Internals]: 1.5,
};

/** 获取文档阅读耗时系数，未标记页面不增加阅读时间。 */
export const getDocDifficultyReadingCoefficient = (difficulty?: DocDifficultyValue): number =>
  difficulty === undefined ? 1 : DocDifficultyReadingCoefficient[difficulty];
