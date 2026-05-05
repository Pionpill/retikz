import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { HighlightCode } from './HighlightCode';

export type CodeBlockProps = {
  /** Prism 语言名（来自围栏 `language-*`），未知值 prism 会回落为不高亮 */
  lang: string;
  /** 代码原文 */
  code: string;
  /** 是否显示左侧行号；不传则按行数自动判断（超过 10 行打开）*/
  showLineNumbers?: boolean;
};

export const CodeBlock: FC<CodeBlockProps> = ({ lang, code, showLineNumbers }) => {
  const trimmed = code.replace(/\n$/, '');

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(trimmed);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  }, [trimmed]);

  return (
    <div className="group relative my-6 overflow-hidden rounded-lg bg-muted/50 text-sm">
      <Button
        size="icon"
        variant="ghost"
        aria-label={copied ? 'Copied' : 'Copy'}
        className="absolute top-2 right-2 z-10 size-7 cursor-pointer rounded-sm text-muted-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
      <HighlightCode lang={lang} code={trimmed} showLineNumbers={showLineNumbers} />
    </div>
  );
};
