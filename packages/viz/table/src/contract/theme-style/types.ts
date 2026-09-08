import type { ResolvedTheme } from '@retikz/core';

import type { IRTableDefaults } from '../../schemas';

/** 当前 Core Theme 下由 Table style 生成的稀疏 Source defaults */
export type TableThemeStyleSource = Readonly<{
  /** 可选的 Table Source defaults 覆盖 */
  defaults?: IRTableDefaults;
}>;

/** 为完整 Core Theme 解析 Table-owned 稀疏 defaults 的运行时定义 */
export type TableThemeStyleDefinition = Readonly<{
  /** 与 Core effective style 同名的稳定名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Table defaults 稀疏片段 */
  resolve: (theme: ResolvedTheme) => TableThemeStyleSource;
}>;
