import GithubSlugger from 'github-slugger';

import type { TocItem } from './types';

const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;
const HEADING_REGEX = /^(#{1,3})[ \t]+(.+)$/gm;

const stripInlineMarkdown = (text: string): string =>
  text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

/** 给代码段外的裸 `<` / `{` / `}` 加反斜杠转义。 */
export const escapeBareJsxTriggers = (source: string): string =>
  source
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 0 ? part.replace(/[<{}]/g, m => `\\${m}`) : part))
    .join('');

/** 从 mdx 源码提取 h1-h3，并对齐 rehype-slug 生成的 DOM id。 */
export const parseHeadings = (source: string): Array<TocItem> => {
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

/** 当前 mdx 源是否含可进入 TOC 的标题。 */
export const mdxHasToc = (source: string): boolean => parseHeadings(source).length > 0;
