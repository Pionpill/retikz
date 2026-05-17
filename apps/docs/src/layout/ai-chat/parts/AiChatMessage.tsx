import { Bot, Check, Copy } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CodeBlock } from '@/components/shared/highlight-code';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../providers/types';
import { RetikzPreview, type RetikzPreviewFormat, RetikzPreviewPending } from './RetikzPreview';

export type AiChatMessageProps = {
  message: ChatMessage;
  /** 是否在流式生成中——若是，末尾追加闪烁光标 */
  isStreaming?: boolean;
  /** true 时动作条常驻不悬浮（用于最新条助手消息） */
  alwaysShowActions?: boolean;
};

type MessageActionsProps = {
  content: string;
  align: 'start' | 'end';
  alwaysShow?: boolean;
};

const MessageActions: FC<MessageActionsProps> = ({ content, align, alwaysShow }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [content]);

  if (!content.trim()) return null;

  return (
    <div
      className={cn(
        align === 'end' ? 'justify-end' : 'justify-start',
        // display 切换：非 alwaysShow 时彻底不占位（hidden），hover/focus/touch 才 flex 出来
        alwaysShow ? 'flex' : 'hidden group-hover:flex focus-within:flex [@media(hover:none)]:flex',
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={copied ? t('ai.messageCopiedLabel') : t('ai.messageCopyLabel')}
        className="size-6 cursor-pointer rounded text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
};

/**
 * AI 对话单条消息
 * @description User: 右对齐 bubble；Assistant: 左对齐 markdown（自带极简解析器）。
 *   解析器支持：段落、围栏代码块、行内 code、链接 ([text](url)) — 链接 `/` 开头走 router Link、外链走新窗口；
 *   粗体 **bold** 与无序列表 -/*。不支持 italic / 表格 / 任意嵌套 markdown，AI 响应大多在此范围内。
 */
export const AiChatMessage: FC<AiChatMessageProps> = ({ message, isStreaming, alwaysShowActions }) => {
  const { t } = useTranslation();
  if (message.role === 'user') {
    // autoSent（系统自动追的修复 prompt）样式区别于真用户气泡：左对齐、虚线边框、小号 Bot 头标记 + 灰底；
    // 走 renderMarkdown 但关掉 retikz live 渲染（消息体里嵌的是上一轮的非法源码，再 live 一次只是再失败一次）
    if (message.autoSent) {
      return (
        <div className="group flex flex-col items-start gap-0.5">
          <div className="flex max-w-[90%] items-start gap-1.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            <Bot className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {t('ai.autoSentBadge')}
              </div>
              <div className="min-w-0 break-words [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {renderMarkdown(message.content, { liveRetikz: false })}
              </div>
            </div>
          </div>
          <MessageActions content={message.content} align="start" />
        </div>
      );
    }
    // 真用户气泡：同样跑 markdown 渲染，支持 ``` 围栏代码、列表、bold、链接；retikz 围栏 live render
    // （用户偶尔粘贴的 retikz 示例也能直接显示渲染图）；first/last 块 margin 重置以贴合气泡内边距
    return (
      <div className="group flex flex-col items-end gap-0.5">
        <div className="max-w-[85%] min-w-0 rounded-2xl bg-muted px-3 py-2 text-sm break-words [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {renderMarkdown(message.content)}
        </div>
        <MessageActions content={message.content} align="end" />
      </div>
    );
  }
  return (
    <div className="group flex flex-col gap-1">
      <div className="text-sm leading-relaxed">
        {renderMarkdown(message.content)}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-foreground/60 align-middle" />
        )}
      </div>
      {!isStreaming && <MessageActions content={message.content} align="start" alwaysShow={alwaysShowActions} />}
    </div>
  );
};

type Block =
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: Array<string> }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'retikz'; format: RetikzPreviewFormat; source: string }
  | { type: 'retikz-pending'; format: RetikzPreviewFormat };

/** 显式 `| undefined`：让 lang 字符串查表后的"未命中"分支不被 TS 视作死代码 */
const RETIKZ_LANG_FORMAT: Readonly<Record<string, RetikzPreviewFormat | undefined>> = {
  'retikz-ir': 'ir',
  'retikz-tsx': 'tsx',
};

const parseBlocks = (src: string): Array<Block> => {
  const lines = src.split('\n');
  const blocks: Array<Block> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const start = i + 1;
      let j = start;
      while (j < lines.length && !lines[j].startsWith('```')) j++;
      const closed = j < lines.length;
      const retikzFormat = RETIKZ_LANG_FORMAT[lang];
      if (retikzFormat !== undefined) {
        // retikz fenced 块特化：闭合走 RetikzPreview 真渲染；未闭合（流式中）走骨架占位
        if (closed) {
          blocks.push({ type: 'retikz', format: retikzFormat, source: lines.slice(start, j).join('\n') });
        } else {
          blocks.push({ type: 'retikz-pending', format: retikzFormat });
        }
      } else {
        blocks.push({ type: 'code', lang: lang || 'text', code: lines.slice(start, j).join('\n') });
      }
      i = j + 1;
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({ type: 'h', level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2] });
      i++;
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items: Array<string> = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    const pStart = i;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i])
    ) {
      i++;
    }
    blocks.push({ type: 'p', text: lines.slice(pStart, i).join('\n') });
  }
  return blocks;
};

/** 行内：code (`...`) → <code>；**bold** → <strong>；[text](url) → <Link>/<a>；其它原文输出 */
const renderInline = (src: string): ReactNode => {
  const nodes: Array<ReactNode> = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > lastIndex) nodes.push(src.slice(lastIndex, m.index));
    const token = m[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code key={`c${key++}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`b${key++}`} className="font-medium">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        const text = linkMatch[1];
        const href = linkMatch[2];
        const linkClass = 'font-medium text-primary underline underline-offset-4';
        if (href.startsWith('/')) {
          nodes.push(
            <Link key={`l${key++}`} to={href} className={linkClass}>
              {text}
            </Link>,
          );
        } else if (/^https?:\/\//i.test(href)) {
          nodes.push(
            <a key={`l${key++}`} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {text}
            </a>,
          );
        } else {
          nodes.push(
            <a key={`l${key++}`} href={href} className={linkClass}>
              {text}
            </a>,
          );
        }
      } else {
        nodes.push(token);
      }
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < src.length) nodes.push(src.slice(lastIndex));
  return nodes.map((n, idx) => <Fragment key={idx}>{n}</Fragment>);
};

type RenderMarkdownOptions = {
  /**
   * retikz 围栏块是否走 live 渲染（默认 true）
   * @description false 时把 retikz 块当作普通 CodeBlock 显示，不再实例化 RetikzPreview。
   *   用于 autoSent 修复反馈：消息里嵌着 AI 上一轮的非法源码，再 live render 一次会再失败一次徒增噪声
   */
  liveRetikz?: boolean;
};

const renderMarkdown = (src: string, options: RenderMarkdownOptions = {}): ReactNode => {
  if (!src) return null;
  const { liveRetikz = true } = options;
  const blocks = parseBlocks(src);
  return blocks.map((b, i) => {
    if (b.type === 'code') {
      return (
        <div key={i} className="my-2">
          <CodeBlock lang={b.lang} code={b.code} />
        </div>
      );
    }
    if (b.type === 'retikz') {
      if (!liveRetikz) {
        return (
          <div key={i} className="my-2">
            <CodeBlock lang={`retikz-${b.format}`} code={b.source} />
          </div>
        );
      }
      return <RetikzPreview key={i} format={b.format} source={b.source} />;
    }
    if (b.type === 'retikz-pending') {
      return <RetikzPreviewPending key={i} format={b.format} />;
    }
    if (b.type === 'h') {
      const baseCls = 'mt-3 mb-1 font-medium';
      const sizeCls = b.level === 1 ? 'text-base' : b.level === 2 ? 'text-sm' : 'text-sm';
      const Cmp = b.level === 1 ? 'h3' : b.level === 2 ? 'h4' : 'h5';
      return (
        <Cmp key={i} className={cn(baseCls, sizeCls)}>
          {renderInline(b.text)}
        </Cmp>
      );
    }
    if (b.type === 'list') {
      return (
        <ul key={i} className="my-2 ml-5 list-disc space-y-1">
          {b.items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-2 whitespace-pre-wrap leading-relaxed">
        {renderInline(b.text)}
      </p>
    );
  });
};
