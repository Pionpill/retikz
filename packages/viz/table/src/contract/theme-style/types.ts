import type { ResolvedTheme } from '@retikz/core';

import type { TableThemeTokenPresetMap } from '../../schemas';

/** 为完整 Core Theme 解析 Table-owned token 基线的运行时定义 */
export type TableThemeStyleDefinition = Readonly<{
  /** 与 Core effective style 同名的稳定名称 */
  name: string;
  /** 解析不含 Core categorical projection 的完整 Table 基线 */
  resolve: (theme: ResolvedTheme) => TableThemeTokenPresetMap;
}>;

/** 擦除泛型后的 Table Theme style definition */
export type AnyTableThemeStyleDefinition = TableThemeStyleDefinition;
