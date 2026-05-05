import { useThemeStore } from '@/store/useThemeStore';
import type { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type CodeBlockProps = {
  /** Prism 语言名（来自围栏 `language-*`），未知值 prism 会回落为不高亮 */
  lang: string;
  /** 代码原文 */
  code: string;
};

export const CodeBlock: FC<CodeBlockProps> = ({ lang, code }) => {
  const theme = useThemeStore(state => state.theme);
  const style = theme === 'dark' ? vscDarkPlus : oneLight;

  return (
    <div className="my-6 overflow-hidden rounded-lg border text-sm">
      <SyntaxHighlighter
        language={lang}
        style={style}
        customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
        codeTagProps={{ style: { background: 'transparent' } }}
      >
        {code.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};
