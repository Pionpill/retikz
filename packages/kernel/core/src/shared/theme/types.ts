import type { ValueOf } from '../types';
import type { ThemeMode, ThemeStyle } from './constants';

export type ThemeStyleValue = ValueOf<typeof ThemeStyle>;

export type ThemeModeValue = ValueOf<typeof ThemeMode>;

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

type ResolvedThemeTokenJsonValue =
  | string
  | number
  | boolean
  | null
  | Array<ResolvedThemeTokenJsonValue>
  | Readonly<{ [key: string]: ResolvedThemeTokenJsonValue }>;

type ResolvedThemeTokenJsonObject = Readonly<{ [key: string]: ResolvedThemeTokenJsonValue }>;

/** 解析上下文中递归不可变的有效 namespace token bag */
export type ResolvedThemeTokenNamespaceBag = Readonly<Record<string, ResolvedThemeTokenJsonObject>>;

/** 编译当前位置完整、只读的有效 Theme */
export type ResolvedTheme = Readonly<{
  /** 当前视觉人格 */
  style: ThemeStyleValue;
  /** 当前明暗环境 */
  mode: ThemeModeValue;
  /** 当前作用域继承后的 sparse namespace token bag */
  tokens: ResolvedThemeTokenNamespaceBag;
  /** 由 style / mode 与 Core token 派生的 shared color view */
  colors: ResolvedThemeColors;
}>;
