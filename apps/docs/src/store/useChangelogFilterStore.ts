import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PACKAGE_IDS, type PackageId } from '@/data/changelog.types';

/** changelog 包筛选状态:选中的包标识集合,默认全选 */
export type ChangelogFilterState = {
  /** 当前选中的包(顺序无关,渲染时按 PACKAGE_IDS 排) */
  selected: Array<PackageId>;
  /** 切换某个包的选中态 */
  toggle: (pkg: PackageId) => void;
  /** 是否选中 */
  isSelected: (pkg: PackageId) => boolean;
};

export const useChangelogFilterStore = create<ChangelogFilterState>()(
  persist(
    (set, get) => ({
      selected: [...PACKAGE_IDS],
      toggle: pkg =>
        set(state => ({
          selected: state.selected.includes(pkg)
            ? state.selected.filter(p => p !== pkg)
            : [...state.selected, pkg],
        })),
      isSelected: pkg => get().selected.includes(pkg),
    }),
    { name: 'retikz-changelog-filter' },
  ),
);
