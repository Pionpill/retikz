import type { RenderMode } from '@retikz/render/runtime';
import type { Context, FC, ReactNode } from 'react';
import { createContext, useContext } from 'react';

/** <Layout> 渲染目标的 context 回退；无 Provider 时为 undefined */
export const RendererModeContext: Context<RenderMode | undefined> = createContext<RenderMode | undefined>(undefined);

/** 读取祖先注入的渲染目标（无则 undefined）；<Layout> 在 `renderer` prop 缺省时回退用它 */
export const useRendererMode = (): RenderMode | undefined => useContext(RendererModeContext);

/** 为子树中未显式指定渲染目标的 Layout 提供默认模式 */
export type RendererModeProviderProps = {
  /** 注入给子树 <Layout>（未显式写 `renderer` 时生效）的渲染目标 */
  mode: RenderMode;
  /** 子树 */
  children: ReactNode;
};

/**
 * 渲染模式提供器
 * @description 设置子树的默认渲染后端；Layout 的 renderer 优先
 */
export const RendererModeProvider: FC<RendererModeProviderProps> = props => {
  const { mode, children } = props;
  return <RendererModeContext.Provider value={mode}>{children}</RendererModeContext.Provider>;
};
