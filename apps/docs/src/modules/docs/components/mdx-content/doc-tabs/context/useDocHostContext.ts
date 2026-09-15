import { createContext, useContext } from 'react';

import type { DocHost } from '@/modules/docs/store';

/** 当前文档内共享的接入选择 */
export type DocHostContextValue = {
  /** 当前文档选中的宿主 */
  host: DocHost;
  /** 仅更新当前文档 */
  setHost: (host: DocHost) => void;
};

/** 文档接入状态上下文 */
export const DocHostContext = createContext<DocHostContextValue | null>(null);

/** 获取当前文档接入状态；独立渲染的组件可不处于文档中 */
export const useDocHostContext = () => useContext(DocHostContext);
