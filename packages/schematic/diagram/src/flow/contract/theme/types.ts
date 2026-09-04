import type { ResolvedTheme } from '@retikz/core';

import type { IRFlowThemeTokenOverrides } from '../../schemas';

/** Flow Theme style 作者提供的稀疏 token 输出 */
export type FlowThemeStyleResolution = Readonly<{
  tokens?: IRFlowThemeTokenOverrides;
}>;

/** 为一个 Core Theme style 解析 Flow token 的运行时定义 */
export type FlowThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => FlowThemeStyleResolution;
}>;
