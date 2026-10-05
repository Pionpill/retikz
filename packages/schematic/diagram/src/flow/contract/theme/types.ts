import type { ResolvedTheme } from '@retikz/core';

import type { IRFlowDefaults } from '../../schemas';

/** 为一个 Core Theme style 解析 Flow-owned 稀疏默认片段的运行时定义 */
export type FlowThemeStyleDefinition = Readonly<{
  /** 在 Flow 主题样式注册表中唯一的名称 */
  name: string;
  /** 根据有效 Core 主题生成 Flow 稀疏默认片段 */
  resolve: (theme: ResolvedTheme) => IRFlowDefaults;
}>;
