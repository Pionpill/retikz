import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useDocHostStore } from '@/modules/docs/store';

import { DocHostContext } from './context';

/** 文档局部接入状态容器属性 */
export type DocHostProviderProps = {
  /** 同一文档的内容 */
  children: ReactNode;
};

/** 以全局偏好初始化，页面内切换仅写局部状态 */
export const DocHostProvider: FC<DocHostProviderProps> = props => {
  const { children } = props;
  const [host, setHost] = useState(() => useDocHostStore.getState().host);
  useEffect(() => useDocHostStore.subscribe(state => setHost(state.host)), []);
  return <DocHostContext.Provider value={{ host, setHost }}>{children}</DocHostContext.Provider>;
};
