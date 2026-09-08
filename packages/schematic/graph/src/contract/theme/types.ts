import type { ResolvedTheme } from '@retikz/core';

import type { IRGraphDefaults, IRGraphRule } from '../../schemas';

/** 当前 Core Theme 下确定的 Graph defaults 与 ordered rules */
export type GraphThemeStyleResolution = Readonly<{
  /** 已确定的稀疏 Graph Source defaults */
  defaults: IRGraphDefaults;
  /** Neutral 与 named definition 生成的有序 Graph rules */
  rules: ReadonlyArray<IRGraphRule>;
}>;

/** Graph Theme style 作者相对 Neutral preset 提供的稀疏 defaults/rules */
export type GraphThemeStyleSource = Readonly<{
  /** 可选稀疏 Graph Source defaults */
  defaults?: IRGraphDefaults;
  /** 可选有序 Graph Source rules */
  rules?: ReadonlyArray<IRGraphRule>;
}>;

/** 为一个 Core Theme style 解析 Graph-owned defaults/rules 的运行时定义 */
export type GraphThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的开放名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Graph defaults/rules 稀疏片段 */
  resolve: (theme: ResolvedTheme) => GraphThemeStyleSource;
}>;
