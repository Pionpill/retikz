import type { FC, PropsWithChildren } from 'react';

/**
 * v0.1 暂未实现的 legacy 组件 stub（PathNode = 边上文字，Scope = 作用域）。
 * MDX 内容里出现 <PathNode/> / <Scope/> 时不至于落到原生 HTML 元素，
 * 等 @retikz/react 补完 Label / Scope 后用真实组件替换。
 *
 * 单独成文件而非和 mdxComponents 同居，是为了让 react-refresh 规则识别
 * 本文件"只 export 组件"，不破坏 HMR。
 */

export const PathNode: FC<PropsWithChildren> = () => null;
export const Scope: FC<PropsWithChildren> = ({ children }) => <>{children}</>;
