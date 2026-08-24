import type { ResolvedTheme } from '@retikz/core';

import type { TableThemeStyleTokenOverrides } from '../../schemas';

/** 为完整 Core Theme 解析 Table-owned 稀疏 token 覆盖的运行时定义 */
export type TableThemeStyleDefinition = Readonly<{
  /** 与 Core effective style 同名的稳定名称 */
  name: string;
  /** 解析相对默认 preset 且不含 Core categorical projection 的稀疏覆盖 */
  resolve: (theme: ResolvedTheme) => TableThemeStyleTokenOverrides;
}>;
