import { type Context, createContext, useContext } from 'react';

/** 渲染目标：SVG 或 Canvas 2D */
export type RendererMode = 'svg' | 'canvas';

/** <Layout> 渲染目标的 context 回退；无 Provider 时为 undefined */
export const RendererModeContext: Context<RendererMode | undefined> = createContext<RendererMode | undefined>(undefined);

/** 读取祖先注入的渲染目标（无则 undefined）；<Layout> 在 `renderer` prop 缺省时回退用它 */
export const useRendererMode = (): RendererMode | undefined => useContext(RendererModeContext);
