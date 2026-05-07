import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 支持的包管理器（与 shadcn 安装页一致） */
export type PkgManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

/** 包管理器选择 store：跨页面、跨 <PackageManagerInstall> 块共享当前选择 */
export type PkgManagerState = {
  pkgManager: PkgManager;
  setPkgManager: (pm: PkgManager) => void;
};

export const usePkgManagerStore = create<PkgManagerState>()(
  persist(
    set => ({
      pkgManager: 'pnpm',
      setPkgManager: pm => set({ pkgManager: pm }),
    }),
    { name: 'retikz-pkg-manager' },
  ),
);
