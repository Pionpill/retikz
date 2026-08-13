import type { ValueOf } from '@retikz/foundation';

import type { ThemeMode, ThemeTokenSource } from './constants';

/** 可由 Theme IR 持久化的开放视觉人格名称 */
export type ThemeStyleValue = string;

export type ThemeModeValue = ValueOf<typeof ThemeMode>;

/** Theme token 相对当前 owner 的来源关系取值 */
export type ThemeTokenSourceValue = ValueOf<typeof ThemeTokenSource>;

/** CSS 颜色在 Core shared color contract 中的 JSON-safe 字符串形态 */
export type CssColorValue = string;

/** 只允许非空颜色数组的通用 tuple 形态 */
export type NonEmptyReadonlyArray<T> = readonly [T, ...Array<T>];

/** Core 为当前 Theme 派生的 shared semantic colors 与 active categorical palette */
export type ResolvedThemeColors = Readonly<{
  /** 跨领域共享的语义颜色角色 */
  semantic: Readonly<{
    error: CssColorValue;
    success: CssColorValue;
    warning: CssColorValue;
  }>;
  /** 当前生效的非空 categorical palette */
  categorical: NonEmptyReadonlyArray<CssColorValue>;
}>;

/** 编译当前位置完整、只读的有效 Theme */
export type ResolvedTheme = Readonly<{
  /** 当前视觉人格 */
  style?: ThemeStyleValue;
  /** 当前明暗环境 */
  mode: ThemeModeValue;
  /** 由 selector 派生的 shared color view */
  colors: ResolvedThemeColors;
}>;
