import type { ResolvedThemeColors, ThemeModeValue } from '../../shared';

/** Theme style resolver 接收的闭合环境 */
export type ThemeStyleResolveContext = Readonly<{
  mode: ThemeModeValue;
}>;

/** 为一个可持久化 Theme style 名称解析 Core shared colors 的运行时定义 */
export type ThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (context: ThemeStyleResolveContext) => ResolvedThemeColors;
}>;

/** 擦除泛型后的 Theme style definition */
export type AnyThemeStyleDefinition = ThemeStyleDefinition;
