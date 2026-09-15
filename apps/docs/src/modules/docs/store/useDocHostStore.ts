import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 文档接入宿主 */
export type DocHost = 'react' | 'vanilla';

/** 全局接入方式偏好 */
export type DocHostState = {
  /** 默认 React，跨页面共享 */
  host: DocHost;
  /** 更新接入方式 */
  setHost: (host: DocHost) => void;
};

/** 持久化菜单设置的接入偏好，文档局部选择不写入此 store */
export const useDocHostStore = create<DocHostState>()(
  persist(set => ({ host: 'react', setHost: host => set({ host }) }), { name: 'retikz-doc-host' }),
);
