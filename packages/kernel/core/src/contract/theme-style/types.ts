import type { CoreSemanticColors, CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '../../shared';

/** Theme style resolver 接收的闭合环境 */
export type ThemeStyleResolveContext = Readonly<{
  mode: ThemeModeValue;
}>;

/** Core Theme style 相对当前 mode 默认 shared colors 的稀疏覆盖 */
export type ThemeStyleColorOverrides = Readonly<{
  /** 跨领域语义颜色的逐角色覆盖 */
  semantic?: Readonly<Partial<CoreSemanticColors>>;
  /** 显式提供时整体替换默认 categorical palette */
  categorical?: NonEmptyReadonlyArray<CssColorValue>;
}>;

/** 为一个可持久化 Theme style 名称解析 Core shared colors 的运行时定义 */
export type ThemeStyleDefinition = Readonly<{
  name: string;
  /** 按当前 mode 返回相对默认 shared colors 的稀疏覆盖 */
  resolve: (context: ThemeStyleResolveContext) => ThemeStyleColorOverrides;
}>;
