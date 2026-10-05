import type { ResolvedTheme } from '@retikz/core';

import type { IRDiagramDefaults } from '../../schemas';

/** 为一个 Core Theme style 解析 Diagram-owned 稀疏覆盖的运行时定义 */
export type DiagramThemeStyleDefinition = Readonly<{
  /** 在 Diagram 主题样式注册表中唯一的名称 */
  name: string;
  /** 根据有效 Core 主题生成 Diagram 稀疏默认片段 */
  resolve: (theme: ResolvedTheme) => IRDiagramDefaults;
}>;
