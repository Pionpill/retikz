import type { ValueOf } from '@retikz/foundation';

/** Theme 明暗环境的闭合取值 */
export const ThemeMode = {
  Light: 'light',
  Dark: 'dark',
} as const;

/** Theme token 相对当前 owner 的来源关系 */
export const ThemeTokenSource = {
  Inherit: 'inherit',
  Local: 'local',
} as const;

export type ThemeMode = ValueOf<typeof ThemeMode>;

/** Theme token 相对当前 owner 的来源关系取值 */
export type ThemeTokenSource = ValueOf<typeof ThemeTokenSource>;
