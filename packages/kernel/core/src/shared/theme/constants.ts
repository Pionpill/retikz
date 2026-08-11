/** 无需额外 definition 即可使用的内置 Theme style */
export const ThemeStyle = {
  Neutral: 'neutral',
} as const;

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
