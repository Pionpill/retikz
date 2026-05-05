import { useThemeStore } from '@/store/useThemeStore';
import type { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type HighlightedCodeProps = {
  /** Prism 语言名（来自围栏 `language-*`），未知值 prism 会回落为不高亮 */
  lang: string;
  /** 代码原文，尾部换行会被裁掉避免多出空行 */
  code: string;
  /** 是否显示左侧行号；不传则按行数自动判断（超过 10 行打开） */
  showLineNumbers?: boolean;
};

const lineNumberOverride = {
  color: 'var(--muted-foreground)',
  fontStyle: 'normal',
  fontWeight: 'normal',
};

export const HighlightedCode: FC<HighlightedCodeProps> = props => {
  const { lang, code, showLineNumbers } = props;

  const theme = useThemeStore(state => state.theme);
  const baseStyle = theme === 'dark' ? oneDark : oneLight;
  const style = {
    ...baseStyle,
    linenumber: { ...baseStyle.linenumber, ...lineNumberOverride },
  };
  const trimmed = code.replace(/\n$/, '');
  const shouldShowLineNumbers = showLineNumbers ?? trimmed.split('\n').length > 10;

  return (
    <SyntaxHighlighter
      language={lang}
      style={style}
      showLineNumbers={shouldShowLineNumbers}
      lineNumberStyle={{
        minWidth: '2.5em',
        paddingRight: '1em',
        textAlign: 'right',
        userSelect: 'none',
      }}
      customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
      codeTagProps={{ style: { background: 'transparent' } }}
    >
      {trimmed}
    </SyntaxHighlighter>
  );
};
