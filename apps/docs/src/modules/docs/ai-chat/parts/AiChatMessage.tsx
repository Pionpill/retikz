import type { TFunction } from 'i18next';
import type { FC, ReactNode } from 'react';

import { Bot, Code, Copy, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { CodeBlock } from '@/modules/docs/components';

import type { ChatMessage } from '../providers/types';
import type { ListItem, TableAlign } from './message-blocks';

import { useAiChatStore } from '../useAiChatStore';
import { extractFirstRetikzBlock, parseMessageBlocks } from './message-blocks';
import { RetikzPreview, RetikzPreviewPending } from './RetikzPreview';

export type AiChatMessageProps = {
  message: ChatMessage;
  /** 消息在 messages 数组中的下标；菜单动作（Edit / Delete / Regenerate）按此定位 */
  index: number;
  /** 是否在流式生成中——若是，末尾追加闪烁光标 */
  isStreaming?: boolean;
};

/** 写剪贴板 + 成功/失败 toast（用 i18n 文案） */
const writeClipboardWithToast = (content: string, t: TFunction) =>
  void navigator.clipboard.writeText(content).then(
    () => toast.success(t('ai.messageCopiedLabel')),
    () => toast.error(t('ai.messageCopyFailedLabel')),
  );

type MessageMenuProps = {
  index: number;
  message: ChatMessage;
  children: ReactNode;
};

/** 用户消息右键菜单：Copy + Edit & Resend（仅非 autoSent）+ Delete from here */
const HumanMessageMenu: FC<MessageMenuProps> = ({ index, message, children }) => {
  const { t } = useTranslation();
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const editAndResendAt = useAiChatStore(s => s.editAndResendAt);
  const truncateMessagesFrom = useAiChatStore(s => s.truncateMessagesFrom);
  const messageCount = useAiChatStore(s => s.messages.length);

  const handleCopy = useCallback(() => writeClipboardWithToast(message.content, t), [message.content, t]);
  const handleEdit = useCallback(() => editAndResendAt(index), [editAndResendAt, index]);
  const handleDelete = useCallback(() => {
    const removed = messageCount - index;
    truncateMessagesFrom(index);
    if (removed > 0) toast.success(t('ai.messageDeletedToast', { count: removed }));
  }, [truncateMessagesFrom, index, messageCount, t]);

  if (!message.content.trim()) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={handleCopy}>
          <Copy />
          {t('ai.messageCopyLabel')}
        </ContextMenuItem>
        {!message.autoSent && (
          <ContextMenuItem onSelect={handleEdit} disabled={isGenerating}>
            <Pencil />
            {t('ai.messageEditLabel')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={handleDelete} disabled={isGenerating}>
          <Trash2 />
          {t('ai.messageDeleteFromHereLabel')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

/** 助手消息右键菜单：Copy + Regenerate + Copy retikz code（条件项） */
const AssistantMessageMenu: FC<MessageMenuProps> = ({ index, message, children }) => {
  const { t } = useTranslation();
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const regenerateAssistantAt = useAiChatStore(s => s.regenerateAssistantAt);

  const handleCopy = useCallback(() => writeClipboardWithToast(message.content, t), [message.content, t]);
  const handleRegenerate = useCallback(() => void regenerateAssistantAt(index), [regenerateAssistantAt, index]);
  const retikzBlock = extractFirstRetikzBlock(message.content);
  const handleCopyRetikz = useCallback(() => {
    if (!retikzBlock) return;
    writeClipboardWithToast(retikzBlock.code, t);
  }, [retikzBlock, t]);

  if (!message.content.trim()) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={handleCopy}>
          <Copy />
          {t('ai.messageCopyLabel')}
        </ContextMenuItem>
        {retikzBlock && (
          <ContextMenuItem onSelect={handleCopyRetikz}>
            <Code />
            {t('ai.messageCopyRetikzLabel', { format: retikzBlock.format })}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleRegenerate} disabled={isGenerating}>
          <RefreshCw />
          {t('ai.messageRegenerateLabel')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

/** AI 对话单条消息。 */
export const AiChatMessage: FC<AiChatMessageProps> = ({ message, index, isStreaming }) => {
  const { t } = useTranslation();
  if (message.role === 'user') {
    if (message.autoSent) {
      return (
        <div className="flex justify-start">
          <HumanMessageMenu index={index} message={message}>
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
          </HumanMessageMenu>
        </div>
      );
    }
    return (
      <div className="flex justify-end">
        <HumanMessageMenu index={index} message={message}>
          <div className="max-w-[85%] min-w-0 rounded-2xl bg-muted px-3 py-2 text-sm break-words [&>:first-child]:mt-0 [&>:last-child]:mb-0">
            {renderMarkdown(message.content)}
          </div>
        </HumanMessageMenu>
      </div>
    );
  }
  return (
    <AssistantMessageMenu index={index} message={message}>
      <div className="text-sm leading-relaxed">
        {renderMarkdown(message.content)}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-foreground/60 align-middle" />
        )}
      </div>
    </AssistantMessageMenu>
  );
};

/** 行内：code (`...`) → <code>；**bold** → <strong>；*italic* → <em>；~~strike~~ → <del>；[text](url) → <Link>/<a>；其它原文输出 */
const renderInline = (src: string): ReactNode => {
  const nodes: Array<ReactNode> = [];
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
      <span className={cn(item.checked === true && 'text-muted-foreground line-through')}>
        {renderInline(item.text)}
      </span>
    </span>
  ) : (
    renderInline(item.text)
  );
  return (
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
  const blocks = parseMessageBlocks(src);
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
        <blockquote key={i} className="my-2 border-l-2 border-border pl-3 whitespace-pre-wrap text-muted-foreground">
          {renderInline(b.text)}
        </blockquote>
      );
    }
    if (b.type === 'hr') {
      return <hr key={i} className="my-3 border-border" />;
    }
    if (b.type === 'table') {
      const alignCls = (a: TableAlign) => (a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left');
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
