import { Fragment } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';

import { CodeBlock } from '@/components/shared/highlight-code';
import { cn } from '@/lib/utils';

/** InlineMarkdown 组件的 props */
export type InlineMarkdownProps = {
  /** Markdown 源字符串 */
  source: string;
  /** 透传给最外层 div 的 className，便于调字号 / 颜色 */
  className?: string;
};

/**
 * 轻量 markdown 渲染（不引第三方 markdown 库）
 * @description 支持：段落 / 围栏代码块 / 行内 code / 链接（router or 新窗口）/ 粗体 / 无序列表 / 1-3 级标题；其它原文输出。专为「插在文档 / 聊天里的短段落 + bullet 列表 + 偶尔代码」准备；不支持表格 / 嵌套列表 / 引用块 / 斜体
 */
export const InlineMarkdown: FC<InlineMarkdownProps> = props => {
  const { source, className } = props;
  return <div className={className}>{renderMarkdown(source)}</div>;
};

type Block =
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: Array<string> }
  | { type: 'h'; level: 1 | 2 | 3; text: string };

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
      blocks.push({ type: 'code', lang: lang || 'text', code: lines.slice(start, j).join('\n') });
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

const renderMarkdown = (src: string): ReactNode => {
  if (!src) return null;
  const blocks = parseBlocks(src);
  return blocks.map((b, i) => {
    if (b.type === 'code') {
      return (
        <div key={i} className="my-2">
          <CodeBlock lang={b.lang} code={b.code} />
        </div>
      );
    }
    if (b.type === 'h') {
      const baseCls = 'mt-3 mb-1 font-medium';
      const sizeCls = b.level === 1 ? 'text-base' : 'text-sm';
      const Cmp = b.level === 1 ? 'h4' : b.level === 2 ? 'h5' : 'h6';
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
