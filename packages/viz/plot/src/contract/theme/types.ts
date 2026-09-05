import type { ResolvedTheme } from '@retikz/core';

import type { IRPlotAxisRule, IRPlotDefaults } from '../../schemas';

/** 当前 Core Theme 下确定的 Plot defaults 与有序 Axis rules */
export type PlotThemeStyleResolution = Readonly<{
  /** 已确定的稀疏 Plot Source defaults */
  defaults: IRPlotDefaults;
  /** 按来源顺序排列的 Axis Source rules */
  rules: ReadonlyArray<IRPlotAxisRule>;
}>;

/** Plot Theme style 作者相对 Neutral preset 提供的稀疏 defaults/rules */
export type PlotThemeStyleSource = Readonly<{
  /** 可选稀疏 Plot Source defaults */
  defaults?: IRPlotDefaults;
  /** 可选有序 Axis Source rules */
  rules?: ReadonlyArray<IRPlotAxisRule>;
}>;

/** 为一个 Core Theme style 解析 Plot-owned defaults/rules 的运行时定义 */
export type PlotThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的开放名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Plot defaults/rules 稀疏片段 */
  resolve: (theme: ResolvedTheme) => PlotThemeStyleSource;
}>;
