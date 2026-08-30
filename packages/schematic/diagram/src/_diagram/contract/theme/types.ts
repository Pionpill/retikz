import type { ResolvedTheme } from '@retikz/core';

import type { IRDiagramTheme } from '../../schemas';

/** Diagram Theme style 作者相对 Neutral 提供的稀疏覆盖 */
export type DiagramThemeStyleOverrides = IRDiagramTheme;

/** 为一个 Core Theme style 解析 Diagram-owned 稀疏覆盖的运行时定义 */
export type DiagramThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => DiagramThemeStyleOverrides;
}>;
