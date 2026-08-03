import type { ValueOf } from '../types';
import type { ThemeMode, ThemeStyle } from './constants';

export type ThemeStyleValue = ValueOf<typeof ThemeStyle>;

export type ThemeModeValue = ValueOf<typeof ThemeMode>;

/** 编译当前位置完整、只读的有效 Theme */
export type ResolvedTheme = Readonly<{
  /** 当前视觉人格 */
  style: ThemeStyleValue;
  /** 当前明暗环境 */
  mode: ThemeModeValue;
}>;
