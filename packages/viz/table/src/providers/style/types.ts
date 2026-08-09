import type { ResolvedTheme } from '@retikz/core';

import type { IRTableThemeTokenOverrides, TableThemeTokenKey, TableThemeTokenMap } from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** Table token cascade 的来源层级 */
export type TableThemeTokenSourceKind = 'preset' | 'shared-categorical' | 'local-theme-token';

/** 单个 Table token 的最终来源 */
export type TableThemeTokenSource = DeepReadonly<{
  /** 最终胜出的 cascade 层级 */
  kind: TableThemeTokenSourceKind;
  /** 可诊断的输入路径 */
  path: string;
}>;

/** Table resolver 使用的 Core effective Theme 形态 */
export type TableThemeContext = Pick<ResolvedTheme, 'style' | 'mode' | 'colors'>;

/** Table resolver 产出的完整 token map 与逐 key 来源 */
export type ResolvedTableThemeTokens = DeepReadonly<{
  /** 完整 19 项 Table token map */
  tokens: TableThemeTokenMap;
  /** 每个 token 的最终 cascade winner */
  sources: Record<TableThemeTokenKey, TableThemeTokenSource>;
}>;

/** Table resolver 接收的 local sparse token overlay */
export type ResolveTableThemeTokenOverlay = DeepReadonly<IRTableThemeTokenOverrides>;
