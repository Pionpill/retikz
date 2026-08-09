import type { ValueOf } from '@retikz/foundation';

/** Bench 可选主题 */
export const Theme = {
  Light: 'light',
  Dark: 'dark',
} as const;

/** Bench 主题取值 */
export type ThemeValue = ValueOf<typeof Theme>;

/** Bench 默认主题，与 docs 保持一致 */
export const defaultTheme: ThemeValue = Theme.Light;

/** 应用主题所需的最小根节点契约 */
export type ThemeRoot = Readonly<{
  classList: Pick<DOMTokenList, 'toggle'>;
}>;

/** 通过 shadcn 约定的 `.dark` class 应用主题 */
export const applyThemeToRoot = (theme: ThemeValue, root: ThemeRoot): void => {
  root.classList.toggle('dark', theme === Theme.Dark);
};
