import GithubSlugger from 'github-slugger';

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;
const HEADING_REGEX = /^(#{1,3})[ \t]+(.+)$/gm;

/** 去掉行内 markdown 语法，让 slug / 显示文本与渲染后一致 */
const stripInlineMarkdown = (text: string): string =>
  text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

/**
 * 从 mdx 源码提取 h1-h3
 * @description 先剥 frontmatter / 围栏代码块避免 ``` 内的 # 被当成标题；用 GithubSlugger 算 id 与 rehype-slug 输出的 DOM id 对齐
 */
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

/** 当前 mdx 源是否含可入 TOC 的标题（h1-h3）；供布局判断右栏是否占位 */
export const mdxHasToc = (source: string): boolean => parseHeadings(source).length > 0;
