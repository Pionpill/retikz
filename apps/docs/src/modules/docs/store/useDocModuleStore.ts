import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DocScopeId } from '@/modules/docs/data';

import { isDocScopeId } from '@/modules/docs/data';

/** 文档模块选择偏好状态。 */
export type DocModuleState = {
  /** 用户最近主动选择的文档 scope。 */
  scope: DocScopeId;
  /** 设置用户主动选择的文档 scope。 */
  selectScope: (scope: DocScopeId) => void;
};

const readPersistedScope = (value: unknown): DocScopeId | null => {
  if (typeof value !== 'object' || value === null || !('scope' in value)) return null;
  const scope = value.scope;
  return isDocScopeId(scope) ? scope : null;
};

/** 持久化用户最近选择的 Docs scope。 */
export const useDocModuleStore = create<DocModuleState>()(
  persist(
    set => ({
      scope: 'home',
      selectScope: scope => set({ scope }),
    }),
    {
      name: 'retikz-doc-scope',
      partialize: state => ({ scope: state.scope }),
      merge: (persistedState, currentState) => {
        const scope = readPersistedScope(persistedState);
        return scope ? { ...currentState, scope } : currentState;
      },
    },
  ),
);
