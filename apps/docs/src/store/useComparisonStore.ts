import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ComparisonTarget, type ComparisonTargetValue } from '@/components/shared/comparison/targets';

/** 对照对象可见性表。 */
export type ComparisonTargetVisibility = Record<ComparisonTargetValue, boolean>;

/** 默认展示全部对照内容，用户按需关闭。 */
export const DEFAULT_COMPARISON_TARGET_VISIBILITY: ComparisonTargetVisibility = {
  [ComparisonTarget.TikZ]: true,
};

/** Comparison store：托管文档站中所有可选对照内容的显示开关。 */
export type ComparisonState = {
  /** 各对照对象是否显示。 */
  visibleTargets: ComparisonTargetVisibility;
  /** 设置某个对照对象是否显示。 */
  setTargetVisible: (target: ComparisonTargetValue, visible: boolean) => void;
  /** 切换某个对照对象显示状态。 */
  toggleTarget: (target: ComparisonTargetValue) => void;
};

const mergeComparisonState = (persistedState: unknown, currentState: ComparisonState): ComparisonState => {
  const persistedComparisonState =
    typeof persistedState === 'object' && persistedState !== null ? (persistedState as Partial<ComparisonState>) : undefined;

  return {
    ...currentState,
    ...persistedComparisonState,
    visibleTargets: {
      ...DEFAULT_COMPARISON_TARGET_VISIBILITY,
      ...persistedComparisonState?.visibleTargets,
    },
  };
};

const migrateComparisonState = (persistedState: unknown, version: number): unknown => {
  if (version > 0) return persistedState;

  const persistedComparisonState =
    typeof persistedState === 'object' && persistedState !== null ? (persistedState as Partial<ComparisonState>) : undefined;

  return {
    ...persistedComparisonState,
    visibleTargets: DEFAULT_COMPARISON_TARGET_VISIBILITY,
  };
};

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      visibleTargets: DEFAULT_COMPARISON_TARGET_VISIBILITY,
      setTargetVisible: (target, visible) =>
        set(state => ({
          visibleTargets: {
            ...state.visibleTargets,
            [target]: visible,
          },
        })),
      toggleTarget: target =>
        set({
          visibleTargets: {
            ...get().visibleTargets,
            [target]: !get().visibleTargets[target],
          },
        }),
    }),
    {
      name: 'retikz-comparison',
      version: 1,
      migrate: migrateComparisonState,
      merge: mergeComparisonState,
    },
  ),
);
