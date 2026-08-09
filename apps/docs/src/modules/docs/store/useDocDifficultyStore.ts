import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DocDifficultyValue } from '@/modules/docs/data';

import { DocDifficulty } from '@/modules/docs/data';

/** 文档阅读难度偏好状态。 */
export type DocDifficultyState = {
  /** 导航中允许显示的最高阅读难度。 */
  maximumDifficulty: DocDifficultyValue;
  /** 设置导航中允许显示的最高阅读难度。 */
  setMaximumDifficulty: (value: DocDifficultyValue) => void;
};

/** 全站统一的文档阅读难度偏好。 */
export const useDocDifficultyStore = create<DocDifficultyState>()(
  persist(
    set => ({
      maximumDifficulty: DocDifficulty.Advanced,
      setMaximumDifficulty: maximumDifficulty => set({ maximumDifficulty }),
    }),
    {
      name: 'retikz-doc-difficulty',
      partialize: state => ({ maximumDifficulty: state.maximumDifficulty }),
    },
  ),
);
