import type { ResolvedTheme } from '@retikz/core';

import type { IRDiagramDefaults } from '../../schemas';

/** 为一个 Core Theme style 解析 Diagram-owned 稀疏覆盖的运行时定义 */
export type DiagramThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRDiagramDefaults;
}>;
