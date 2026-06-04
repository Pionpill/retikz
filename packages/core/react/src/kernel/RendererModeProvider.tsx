import { type FC, type ReactNode } from 'react';

import { type RendererMode, RendererModeContext } from './rendererContext';

type RendererModeProviderProps = {
  /** 注入给子树 <Layout>（未显式写 `renderer` 时生效）的渲染目标 */
  mode: RendererMode;
  /** 子树 */
  children: ReactNode;
};

/**
 * 渲染目标 Provider
 * @description 给子树统一注入 svg / canvas：子树内 <Layout> 未显式写 `renderer` prop 时采用之。
 *   典型用途——外层（如文档预览）想切换一个无法改其内部 `<Layout renderer>` 的交互式子树的渲染目标，
 *   用本 Provider 包住即可。显式 `renderer` prop 始终优先于 context
 */
export const RendererModeProvider: FC<RendererModeProviderProps> = props => {
  const { mode, children } = props;
  return <RendererModeContext.Provider value={mode}>{children}</RendererModeContext.Provider>;
};
