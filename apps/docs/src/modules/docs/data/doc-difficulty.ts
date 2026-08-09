import type { DocDifficultyValue } from './types';

import { DocDifficulty } from './types';

/** 文档难度按阅读深度从低到高排列。 */
export const DocDifficultyList: ReadonlyArray<DocDifficultyValue> = [
  DocDifficulty.Beginner,
  DocDifficulty.Advanced,
  DocDifficulty.Internals,
];

const difficultyRank: Record<DocDifficultyValue, number> = {
  [DocDifficulty.Beginner]: 0,
  [DocDifficulty.Advanced]: 1,
  [DocDifficulty.Internals]: 2,
};

/** 文档难度对应的阅读耗时系数。 */
export const DocDifficultyReadingCoefficient: Record<DocDifficultyValue, number> = {
  [DocDifficulty.Beginner]: 1,
  [DocDifficulty.Advanced]: 1.2,
  [DocDifficulty.Internals]: 1.5,
};

/** 获取文档阅读耗时系数，未标记页面不增加阅读时间。 */
export const getDocDifficultyReadingCoefficient = (difficulty?: DocDifficultyValue): number =>
  difficulty === undefined ? 1 : DocDifficultyReadingCoefficient[difficulty];

/** 判断字符串是否为合法文档难度。 */
export const isDocDifficultyValue = (value: string): value is DocDifficultyValue =>
  DocDifficultyList.some(option => option === value);

/** 判断文档在当前最高阅读难度下是否可见。 */
export const isDocDifficultyVisible = (
  difficulty: DocDifficultyValue | undefined,
  maximum: DocDifficultyValue,
): boolean => difficulty === undefined || difficultyRank[difficulty] <= difficultyRank[maximum];
