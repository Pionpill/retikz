import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PACKAGE_IDS, type PackageId } from '@/data/changelog.types';

/** 选中集合 → 被排除集合(按 PACKAGE_IDS 顺序) */
const toExcluded = (selected: ReadonlyArray<PackageId>): Array<PackageId> =>
  PACKAGE_IDS.filter(id => !selected.includes(id));
/** 被排除集合 → 选中集合(新加入 PACKAGE_IDS 的包不在排除表 ⇒ 默认选中) */
const toSelected = (excluded: ReadonlyArray<PackageId>): Array<PackageId> =>
  PACKAGE_IDS.filter(id => !excluded.includes(id));

/** changelog 包筛选状态:选中的包标识集合,默认全选 */
export type ChangelogFilterState = {
  /** 当前选中的包(按 PACKAGE_IDS 顺序) */
  selected: Array<PackageId>;
  /** 切换某个包的选中态 */
  toggle: (pkg: PackageId) => void;
};

/**
 * 持久化「被排除的包」而非「选中的包」:这样将来 PACKAGE_IDS 新增包时,
 * 旧存档里不含该包 ⇒ 自动按默认选中,而非被悄悄隐藏。
 */
export const useChangelogFilterStore = create<ChangelogFilterState>()(
  persist(
    set => ({
      selected: [...PACKAGE_IDS],
      toggle: pkg =>
        set(state => {
          const next = state.selected.includes(pkg)
            ? state.selected.filter(p => p !== pkg)
            : [...state.selected, pkg];
          return { selected: PACKAGE_IDS.filter(id => next.includes(id)) };
        }),
    }),
    {
      name: 'retikz-changelog-filter',
      version: 1,
      partialize: state => ({ excluded: toExcluded(state.selected) }),
      merge: (persisted, current) => {
        const raw = (persisted as { excluded?: Array<PackageId> } | null)?.excluded ?? [];
        const excluded = raw.filter((id): id is PackageId => (PACKAGE_IDS as ReadonlyArray<string>).includes(id));
        return { ...current, selected: toSelected(excluded) };
      },
    },
  ),
);
