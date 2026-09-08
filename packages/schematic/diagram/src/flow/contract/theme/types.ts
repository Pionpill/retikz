import type { ResolvedTheme } from '@retikz/core';

import type { IRFlowDefaults } from '../../schemas';

/** 为一个 Core Theme style 解析 Flow-owned 稀疏默认片段的运行时定义 */
export type FlowThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRFlowDefaults;
}>;
