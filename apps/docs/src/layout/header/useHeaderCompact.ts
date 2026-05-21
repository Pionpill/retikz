import { createContext, useContext } from 'react';

/**
 * Header 紧凑模式 Context
 * @description 由 `AppHeader` 顶层 Provider 注入，值 = header 自身宽度是否 < `@4xl/header:` 阈值（56rem ≈ 896px）。
 *   in-tree DOM 用容器查询 CSS 直接解决；这里专门给 Radix Portal 出去的 `DropdownMenuContent` 子树用——
 *   Radix Portal 是 React `createPortal`，React 树连通，所以 Context 可穿透
 */
export const HeaderCompactContext = createContext<boolean>(false);

/**
 * 读 header 紧凑模式标记。
 * @description 默认 false；Provider 范围外（理论上不会发生）回退到 false 等价于「桌面完整 chrome」
 */
export const useHeaderCompact = (): boolean => useContext(HeaderCompactContext);
