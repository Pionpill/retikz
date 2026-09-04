import type { ThemedToken } from 'shiki/types';

import { createHighlighter } from 'shiki';

export type HighlightTheme = 'light' | 'dark';

export type TokenizeHighlightCodeInput = {
  /** 代码原文 */
  code: string;
  /** 围栏或源码文件声明的语言 */
  lang: string;
  /** 当前站点明暗主题 */
  theme: HighlightTheme;
};

type HighlightLanguage = 'typescript' | 'tsx' | 'json' | 'bash' | 'text';

const LANGUAGE_ALIASES: Readonly<Record<string, HighlightLanguage>> = {
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  json: 'json',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  text: 'text',
  plaintext: 'text',
  txt: 'text',
};

const THEME_NAMES = {
  light: 'light-plus',
  dark: 'dark-plus',
} as const;

const highlighterPromise = createHighlighter({
  langs: ['typescript', 'tsx', 'json', 'bash'],
  themes: [THEME_NAMES.light, THEME_NAMES.dark],
});

/** 将外部语言名收敛到站点已加载的 Shiki grammar */
export const resolveHighlightLanguage = (lang: string): HighlightLanguage =>
  LANGUAGE_ALIASES[lang.trim().toLowerCase()] ?? 'text';

/** 使用共享 Shiki 实例把代码转换为可逐行渲染的 token */
export const tokenizeHighlightCode = async (input: TokenizeHighlightCodeInput): Promise<Array<Array<ThemedToken>>> => {
  const { code, lang, theme } = input;
  const highlighter = await highlighterPromise;

  return highlighter.codeToTokensBase(code, {
    lang: resolveHighlightLanguage(lang),
    theme: THEME_NAMES[theme],
  });
};
