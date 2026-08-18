import type { ResolvedTheme } from '@retikz/core';

import type { IRGraphEntityThemeTokenRules, IRGraphThemeTokenResolution } from '../../schemas';

/** Graph Theme style 解析后的完整 baseline 与有序 Entity rules */
export type GraphThemeStyleResolution = Readonly<{
  /** 完整 Graph Entity token baseline */
  tokens: IRGraphThemeTokenResolution;
  /** 可选的有序 Entity selector rules */
  tokenRules?: IRGraphEntityThemeTokenRules;
}>;

/** 为一个 Core Theme style 解析 Graph-owned token 的运行时定义 */
export type GraphThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的开放名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Graph baseline */
  resolve: (theme: ResolvedTheme) => GraphThemeStyleResolution;
}>;
