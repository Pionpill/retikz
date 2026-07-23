import type { FC } from 'react';

import { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useThemeStore } from '@/store';

import type { DiffLineKind } from '../component-preview';

export type HighlightCodeProps = {
  /** Prism 语言名。 */
  lang: string;
  /** 代码原文。 */
  code: string;
  /** 是否显示左侧行号。 */
  showLineNumbers?: boolean;
  /** 每行的 diff 种类。 */
  lineKinds?: ReadonlyArray<DiffLineKind>;
};

const lineNumberOverride = {
  color: 'var(--muted-foreground)',
  fontStyle: 'normal',
  fontWeight: 'normal',
};

const LINE_BASE_CLASS = 'block relative pl-5';
const LINE_KIND_CLASS: Record<DiffLineKind, string> = {
  context: LINE_BASE_CLASS,
  added: `${LINE_BASE_CLASS} bg-emerald-500/15 before:content-['+'] before:absolute before:left-1 before:text-emerald-600 dark:before:text-emerald-400`,
  removed: `${LINE_BASE_CLASS} bg-red-500/15 before:content-['-'] before:absolute before:left-1 before:text-red-600 dark:before:text-red-400`,
};

const HighlightCodeComponent: FC<HighlightCodeProps> = props => {
  const { lang, code, showLineNumbers, lineKinds } = props;

  const theme = useThemeStore(state => state.theme);
  const baseStyle = theme === 'dark' ? oneDark : oneLight;
  const style = {
    ...baseStyle,
    linenumber: { ...baseStyle.linenumber, ...lineNumberOverride },
  };
  const shouldShowLineNumbers = showLineNumbers ?? code.split('\n').length > 10;

  const hasDiff = lineKinds !== undefined && lineKinds.length > 0;
  const wrapLines = hasDiff;
  const lineProps = hasDiff
    ? (lineNumber: number) => ({
        className: LINE_KIND_CLASS[lineKinds[lineNumber - 1] ?? 'context'],
      })
    : undefined;

  return (
    <SyntaxHighlighter
      language={lang}
      style={style}
      showLineNumbers={shouldShowLineNumbers}
      wrapLines={wrapLines}
      lineProps={lineProps}
      lineNumberStyle={{
        minWidth: '2.5em',
        paddingRight: '1em',
        textAlign: 'right',
        userSelect: 'none',
      }}
      customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
      codeTagProps={{
        style: hasDiff
          ? { background: 'transparent', display: 'inline-block', minWidth: '100%' }
          : { background: 'transparent' },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

/** 相同源码与主题下复用语法高亮结果。 */
export const HighlightCode = memo(HighlightCodeComponent);
