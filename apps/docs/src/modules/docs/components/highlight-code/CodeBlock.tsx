import { Check, Copy } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import type { DiffLineKind } from '../component-preview';
import { HighlightCode } from './HighlightCode';

export type CodeBlockProps = {
  /** Shiki 语言名（来自围栏 `language-*`），未知值回落为纯文本 */
  lang: string;
  /** 代码原文；行尾 // [!code ++] 标记新增行，独立标记行作用于上一行；展示与复制时移除标记 */
  code: string;
  /** 是否显示左侧行号；不传则按行数自动判断（超过 10 行打开）*/
  showLineNumbers?: boolean;
};

export const CodeBlock: FC<CodeBlockProps> = ({ lang, code, showLineNumbers }) => {
  const trimmed = code.replace(/\n$/, '');
  const lines = trimmed.split('\n');
  const addedLineMarker = /\s*\/\/\s*\[!code \+\+\]\s*$/;
  const lineKinds: Array<DiffLineKind> = [];
  const displayLines: Array<string> = [];
  for (const line of lines) {
    const added = addedLineMarker.test(line);
    const content = line.replace(addedLineMarker, '');
    // 格式化器可能把块起始行的标记移到下一行，合并回上一行以避免显示空行
    if (added && content.trim() === '') {
      if (lineKinds.length > 0) lineKinds[lineKinds.length - 1] = 'added';
      continue;
    }
    displayLines.push(content);
    lineKinds.push(added ? 'added' : 'context');
  }
  const displayCode = displayLines.join('\n');

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = () => {
    void navigator.clipboard.writeText(displayCode);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

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
      <HighlightCode
        lang={lang}
        code={displayCode}
        showLineNumbers={showLineNumbers}
        lineKinds={lineKinds.includes('added') ? lineKinds : undefined}
      />
    </div>
  );
};
