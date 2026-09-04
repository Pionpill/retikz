import type { CSSProperties, FC } from 'react';
import type { ThemedToken } from 'shiki/types';

import { memo, useEffect, useState } from 'react';
import { getTokenStyleObject } from 'shiki/core';

import { cn } from '@/lib';
import { useThemeStore } from '@/store';

import type { DiffLineKind } from '../component-preview';

import { tokenizeHighlightCode } from './shiki-highlighter';

export type HighlightCodeProps = {
  /** Shiki 语言名 */
  lang: string;
  /** 代码原文 */
  code: string;
  /** 是否显示左侧行号 */
  showLineNumbers?: boolean;
  /** 每行的 diff 种类 */
  lineKinds?: ReadonlyArray<DiffLineKind>;
};

const LINE_KIND_CLASS: Record<DiffLineKind, string> = {
  context: '',
  added: 'bg-emerald-500/15',
  removed: 'bg-red-500/15',
};

const LINE_MARKER: Record<DiffLineKind, string> = {
  context: '',
  added: '+',
  removed: '-',
};

const LINE_MARKER_CLASS: Record<DiffLineKind, string> = {
  context: '',
  added: 'text-emerald-600 dark:text-emerald-400',
  removed: 'text-red-600 dark:text-red-400',
};

type HighlightedCodeState = {
  code: string;
  lang: string;
  theme: 'light' | 'dark';
  lines: Array<Array<ThemedToken>>;
};

/** 将 TextMate 字体标记映射为 React 行内样式 */
const tokenStyle = (token: ThemedToken): CSSProperties => {
  const style = getTokenStyleObject(token);

  return {
    color: style.color,
    backgroundColor: style['background-color'],
    fontStyle: style['font-style'] === 'italic' ? 'italic' : undefined,
    fontWeight: style['font-weight'] === 'bold' ? 'bold' : undefined,
    textDecoration: style['text-decoration'],
  };
};

const HighlightCodeComponent: FC<HighlightCodeProps> = props => {
  const { lang, code, showLineNumbers, lineKinds } = props;

  const siteTheme = useThemeStore(state => state.theme);
  const theme = siteTheme === 'dark' ? 'dark' : 'light';
  const [highlighted, setHighlighted] = useState<HighlightedCodeState>();
  const shouldShowLineNumbers = showLineNumbers ?? code.split('\n').length > 10;
  const hasDiff = lineKinds !== undefined && lineKinds.length > 0;

  useEffect(() => {
    let active = true;

    void tokenizeHighlightCode({ code, lang, theme })
      .then(lines => {
        if (active) setHighlighted({ code, lang, theme, lines });
      })
      .catch(() => {
        if (active) setHighlighted(undefined);
      });

    return () => {
      active = false;
    };
  }, [code, lang, theme]);

  const highlightedLines =
    highlighted?.code === code && highlighted.lang === lang && highlighted.theme === theme
      ? highlighted.lines
      : undefined;
  const rawLines = code.split('\n');
  const lineCount = highlightedLines?.length ?? rawLines.length;

  return (
    <pre className="shiki m-0 overflow-auto bg-transparent p-4 font-mono text-sm leading-6 whitespace-pre [tab-size:2]">
      <code className="block min-w-max bg-transparent">
        {Array.from({ length: lineCount }, (_, lineIndex) => {
          const lineKind = hasDiff ? (lineKinds[lineIndex] ?? 'context') : 'context';
          const tokens = highlightedLines?.[lineIndex];

          return (
            <span key={lineIndex} className={cn('block min-h-6', LINE_KIND_CLASS[lineKind])}>
              {shouldShowLineNumbers ? (
                <span aria-hidden className="inline-block min-w-14 pr-4 text-right text-muted-foreground select-none">
                  {lineIndex + 1}
                </span>
              ) : null}
              {hasDiff ? (
                <span aria-hidden className={cn('inline-block w-5 select-none', LINE_MARKER_CLASS[lineKind])}>
                  {LINE_MARKER[lineKind]}
                </span>
              ) : null}
              {tokens !== undefined
                ? tokens.map((token, tokenIndex) => (
                    <span key={`${token.offset}-${tokenIndex}`} style={tokenStyle(token)}>
                      {token.content}
                    </span>
                  ))
                : rawLines[lineIndex]}
            </span>
          );
        })}
      </code>
    </pre>
  );
};

/** 相同源码与主题下复用语法高亮结果 */
export const HighlightCode = memo(HighlightCodeComponent);
