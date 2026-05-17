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
 *   粗体 **bold**、斜体 *italic*、删除线 ~~strike~~、引用块 `> ...`、水平线 `---`、表格 GFM、
 *   无序列表（含嵌套、任务列表 `- [ ] / - [x]`）、h1-h3。
 *   不支持有序列表 / 嵌套表格 / 行内 HTML 等不常见语法。
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

type TableAlign = 'left' | 'center' | 'right' | null;

type ListItem = {
  text: string;
  /** null：普通列表项；boolean：任务列表项（GFM `- [ ]` / `- [x]`） */
  checked: boolean | null;
  children: Array<ListItem>;
};

type Block =
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: Array<ListItem> }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'retikz'; format: RetikzPreviewFormat; source: string }
  | { type: 'retikz-pending'; format: RetikzPreviewFormat }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'table'; header: Array<string>; aligns: Array<TableAlign>; rows: Array<Array<string>> };

/** 显式 `| undefined`：让 lang 字符串查表后的"未命中"分支不被 TS 视作死代码 */
const RETIKZ_LANG_FORMAT: Readonly<Record<string, RetikzPreviewFormat | undefined>> = {
  'retikz-ir': 'ir',
  'retikz-tsx': 'tsx',
};

const RE_HEADING = /^(#{1,3})\s+(.*)$/;
const RE_LIST = /^[-*]\s/;
/** 含缩进的列表项；tab 视作 2 空格 */
const RE_LIST_INDENTED = /^(\s*)[-*]\s+/;
/** 任务列表前缀（去掉列表标记后剩下的内容前缀）：`[ ]`、`[x]`、`[X]` */
const RE_TASK_ITEM = /^\[([ xX])\]\s+(.*)$/;
const RE_BLOCKQUOTE = /^>\s?/;
const RE_HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;
/** GitHub table separator：`|---|---|`、`|:---|---:|:---:|` 等，至少 2 列 */
const RE_TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

/** 拆 `| a | b | c |` 这种行；可省略首尾管道 */
const parseTableRow = (line: string): Array<string> => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
};

const parseTableAligns = (separator: string): Array<TableAlign> =>
  parseTableRow(separator).map(cell => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });

const isTableStart = (lines: Array<string>, idx: number): boolean =>
  lines[idx].includes('|') && idx + 1 < lines.length && RE_TABLE_SEPARATOR.test(lines[idx + 1]);

/** 当前行若是列表项（任意缩进），返回其缩进字符数（tab → 2 空格）；否则 null */
const getListIndent = (line: string): number | null => {
  const m = RE_LIST_INDENTED.exec(line);
  if (!m) return null;
  return m[1].replace(/\t/g, '  ').length;
};

/** 把单行列表项的"裸文本"（去掉 `- ` / `* ` 标记后的部分）切成 task 或普通项 */
const buildListItem = (raw: string): ListItem => {
  const taskMatch = RE_TASK_ITEM.exec(raw);
  if (taskMatch) return { text: taskMatch[2], checked: taskMatch[1].toLowerCase() === 'x', children: [] };
  return { text: raw, checked: null, children: [] };
};

/**
 * 从 `start` 开始递归吃下一段同级（缩进 == baseIndent）的列表项；
 * 遇到更深缩进的列表行就递归塞进当前 item.children；遇到更浅缩进或非列表行就停止
 */
const parseListAt = (
  lines: Array<string>,
  start: number,
  baseIndent: number,
): { items: Array<ListItem>; end: number } => {
  const items: Array<ListItem> = [];
  let i = start;
  while (i < lines.length) {
    const indent = getListIndent(lines[i]);
    if (indent === null || indent < baseIndent) break;
    if (indent > baseIndent) break;
    const raw = lines[i].replace(/^\s*[-*]\s+/, '');
    const item = buildListItem(raw);
    i++;
    if (i < lines.length) {
      const nextIndent = getListIndent(lines[i]);
      if (nextIndent !== null && nextIndent > baseIndent) {
        const child = parseListAt(lines, i, nextIndent);
        item.children = child.items;
        i = child.end;
      }
    }
    items.push(item);
  }
  return { items, end: i };
};

/** 段落收集器停止条件：遇到任意块起始或空行就收尾 */
const isBlockStarter = (lines: Array<string>, idx: number): boolean => {
  const line = lines[idx];
  if (line.trim() === '') return true;
  if (line.startsWith('```')) return true;
  if (RE_HEADING.test(line)) return true;
  if (RE_LIST.test(line)) return true;
  if (RE_BLOCKQUOTE.test(line)) return true;
  if (RE_HR.test(line)) return true;
  if (isTableStart(lines, idx)) return true;
  return false;
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
    const headingMatch = RE_HEADING.exec(line);
    if (headingMatch) {
      blocks.push({ type: 'h', level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2] });
      i++;
      continue;
    }
    if (RE_LIST.test(line)) {
      const { items, end } = parseListAt(lines, i, 0);
      blocks.push({ type: 'list', items });
      i = end;
      continue;
    }
    if (RE_BLOCKQUOTE.test(line)) {
      const start = i;
      while (i < lines.length && RE_BLOCKQUOTE.test(lines[i])) i++;
      const text = lines
        .slice(start, i)
        .map(l => l.replace(RE_BLOCKQUOTE, ''))
        .join('\n');
      blocks.push({ type: 'blockquote', text });
      continue;
    }
    // table：当前行带 `|` 且下一行是分隔行；优先于 hr 判断（`|---|` 含管道，被 RE_HR 拒绝，但更明确的顺序更安全）
    if (isTableStart(lines, i)) {
      const header = parseTableRow(lines[i]);
      const aligns = parseTableAligns(lines[i + 1]);
      i += 2;
      const rows: Array<Array<string>> = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, aligns, rows });
      continue;
    }
    if (RE_HR.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    const pStart = i;
    while (i < lines.length && !isBlockStarter(lines, i)) {
      i++;
    }
    blocks.push({ type: 'p', text: lines.slice(pStart, i).join('\n') });
  }
  return blocks;
};

/** 行内：code (`...`) → <code>；**bold** → <strong>；*italic* → <em>；~~strike~~ → <del>；[text](url) → <Link>/<a>；其它原文输出 */
const renderInline = (src: string): ReactNode => {
  const nodes: Array<ReactNode> = [];
  // 顺序敏感：bold (`\*\*..\*\*`) 必须排在 italic (`\*..\*`) 之前；italic 用 lookaround 避开 `**` 边界和"两侧空格"误命中（避免 `5 * 6 * 2` 被吞）
  const re =
    /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|((?<!\*)\*(?!\s)[^*\n]+?(?<!\s)\*(?!\*))|(~~[^~\n]+~~)|(\[[^\]]+\]\([^)\s]+\))/g;
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
    } else if (token.startsWith('~~')) {
      nodes.push(
        <del key={`s${key++}`} className="text-muted-foreground">
          {token.slice(2, -2)}
        </del>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={`i${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
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

/** 渲染单个列表项（含 task checkbox + 嵌套子列表）；递归 */
const renderListItem = (item: ListItem, idx: number): ReactNode => {
  const isTask = item.checked !== null;
  const body = isTask ? (
    <span className="inline-flex items-start gap-1.5">
      <input
        type="checkbox"
        checked={item.checked === true}
        readOnly
        className="mt-1 size-3.5 shrink-0 cursor-default accent-primary"
      />
      <span className={cn(item.checked === true && 'text-muted-foreground line-through')}>{renderInline(item.text)}</span>
    </span>
  ) : (
    renderInline(item.text)
  );
  return (
    // task 项关 disc + 负 ml 抵消父 ul 的 ml-5，让 checkbox 起点对齐普通 bullet
    <li key={idx} className={isTask ? '-ml-5 list-none' : undefined}>
      {body}
      {item.children.length > 0 && (
        <ul className="mt-1 ml-5 list-disc space-y-1">
          {item.children.map((child, childIdx) => renderListItem(child, childIdx))}
        </ul>
      )}
    </li>
  );
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
          {b.items.map((it, idx) => renderListItem(it, idx))}
        </ul>
      );
    }
    if (b.type === 'blockquote') {
      return (
        <blockquote
          key={i}
          className="my-2 border-l-2 border-border pl-3 whitespace-pre-wrap text-muted-foreground"
        >
          {renderInline(b.text)}
        </blockquote>
      );
    }
    if (b.type === 'hr') {
      return <hr key={i} className="my-3 border-border" />;
    }
    if (b.type === 'table') {
      const alignCls = (a: TableAlign) =>
        a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';
      return (
        <div key={i} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {b.header.map((h, hi) => (
                  <th key={hi} className={cn('px-2 py-1 font-medium', alignCls(b.aligns[hi] ?? null))}>
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-b-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className={cn('px-2 py-1', alignCls(b.aligns[ci] ?? null))}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <p key={i} className="my-2 whitespace-pre-wrap leading-relaxed">
        {renderInline(b.text)}
      </p>
    );
  });
};
