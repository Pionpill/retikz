import { useThemeStore } from '@/store/useThemeStore';
import type { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type HighlightCodeProps = {
  /** Prism 语言名（来自围栏 `language-*`），未知值 prism 会回落为不高亮 */
  lang: string;
  /** 代码原文；调用方负责自己裁尾换行（不在这里裁是因为 ComponentPreview 的截断切片可能合法地以空行结尾，
   *  自动裁会把那一行吃掉，所以让 CodeBlock 这种「mdx 围栏带尾换行」的场景在调用前自己 replace(/\n$/, '')） */
  code: string;
  /** 是否显示左侧行号；不传则按行数自动判断（超过 10 行打开） */
  showLineNumbers?: boolean;
};

const lineNumberOverride = {
  color: 'var(--muted-foreground)',
  fontStyle: 'normal',
  fontWeight: 'normal',
};

export const HighlightCode: FC<HighlightCodeProps> = props => {
  const { lang, code, showLineNumbers } = props;

  const theme = useThemeStore(state => state.theme);
  const baseStyle = theme === 'dark' ? oneDark : oneLight;
  const style = {
    ...baseStyle,
    linenumber: { ...baseStyle.linenumber, ...lineNumberOverride },
  };
  const shouldShowLineNumbers = showLineNumbers ?? code.split('\n').length > 10;

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
      {code}
    </SyntaxHighlighter>
  );
};
