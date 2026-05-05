import { cn } from '@/lib/utils';
import GithubSlugger from 'github-slugger';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type TocItem = {
  id: string;
  text: string;
  level: number;
};

const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;
const HEADING_REGEX = /^(#{1,3})[ \t]+(.+)$/gm;
/** 顶部 sticky header h-12 (48px) + 留白 */
const SCROLL_OFFSET = 64;

const levelIndent: Record<number, string> = {
  1: '',
  2: 'pl-3',
  3: 'pl-6',
};

/** 去掉行内 markdown 语法，让 slug / 显示文本与渲染后一致 */
const stripInlineMarkdown = (text: string): string =>
  text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

/**
 * 从 mdx 源码提取 h1-h3。
 * - 先剥 frontmatter / 围栏代码块，避免 ``` 内的 # 被当成标题
 * - 用 GithubSlugger 算 id，跟 rehype-slug 输出的 DOM id 对得上
 */
const parseHeadings = (source: string): Array<TocItem> => {
  const cleaned = source.replace(FRONTMATTER_REGEX, '').replace(FENCED_CODE_REGEX, '');
  const items: Array<TocItem> = [];
  const slugger = new GithubSlugger();
  HEADING_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HEADING_REGEX.exec(cleaned)) !== null) {
    const hashes = match[1];
    const raw = match[2];
    if (!hashes || !raw) continue;
    const level = hashes.length;
    const text = stripInlineMarkdown(raw.trim());
    items.push({ id: slugger.slug(text), text, level });
  }
  return items;
};

export type MdxTocProps = {
  /** 当前页面的 mdx 源码 */
  source: string;
};

export const MdxToc: FC<MdxTocProps> = ({ source }) => {
  const items = useMemo(() => parseHeadings(source), [source]);
  const [activeId, setActiveId] = useState<string>('');

  // 滚动监听：找当前视口内最靠上、且越过 SCROLL_OFFSET 的最深一个 heading 作为 active
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
      let current = items[0]?.id ?? '';
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) {
          current = item.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [items]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  if (items.length === 0) return null;

  return (
    <nav>
      <ul className="space-y-1 border-l border-border">
        {items.map(item => (
          <li key={item.id} className={cn('leading-relaxed', levelIndent[item.level])}>
            <button
              type="button"
              onClick={() => handleClick(item.id)}
              className={cn(
                'block w-full cursor-pointer truncate py-0.5 pl-3 text-left text-sm transition-colors',
                activeId === item.id
                  ? 'font-semibold text-blue-500'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
