/**
 * docs 全站 mdx 搜索索引（lazy load + per-language）
 * @description 首次调用 `loadSearchIndex()` 时并行 fetch contents 下所有 mdx，按页路径 / 语言分桶保存 description / H2-3 标题 / 单行反引号 inline code 的原始字符串（保留大小写，给结果列表高亮用）。结果缓存到模块作用域；二次调用直接返回。Eager 模式会把 raw mdx 灌进首屏 bundle，改 lazy 后只在用户按 Cmd+K 触发
 */

import type { Lang } from '@/i18n';
import { LANGS } from '@/i18n';

type MdxLoader = () => Promise<string>;

const mdxLoaders: Record<string, MdxLoader | undefined> = import.meta.glob<string>(
  '../../../contents/**/*.mdx',
  { query: '?raw', import: 'default' },
);

/** glob key → 路由路径与语言；语言不在 LANGS 列表时返回 null */
const parseKey = (key: string): { path: string; lang: Lang } | null => {
  const match = key.match(/\/contents\/(.+)\/index\.([a-z]+)\.mdx$/);
  if (!match) return null;
  const candidate = match[2] as Lang;
  if (!LANGS.includes(candidate)) return null;
  return { path: `/${match[1]}`, lang: candidate };
};

/** 一页 mdx 抽取出的可索引字段；保留原始大小写以便结果里高亮显示 */
export type IndexedPage = {
  description: string;
  headings: ReadonlyArray<string>;
  inlineCodes: ReadonlyArray<string>;
};

const extractIndexedPage = (raw: string): IndexedPage => {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const body = frontmatterMatch ? raw.slice(frontmatterMatch[0].length) : raw;

  let description = '';
  if (frontmatterMatch) {
    const descriptionMatch = frontmatterMatch[1].match(/^description:\s*(.+)$/m);
    if (descriptionMatch) description = descriptionMatch[1].trim();
  }

  const headings: Array<string> = [];
  for (const headingMatch of body.matchAll(/^#{2,3}\s+(.+)$/gm)) {
    headings.push(headingMatch[1].trim());
  }

  const inlineCodes: Array<string> = [];
  for (const inlineMatch of body.matchAll(/`([^`\n]+)`/g)) {
    inlineCodes.push(inlineMatch[1].trim());
  }

  return { description, headings, inlineCodes };
};

export type SearchIndex = Partial<Record<string, Partial<Record<Lang, IndexedPage>>>>;

let cached: SearchIndex | null = null;
let pending: Promise<SearchIndex> | null = null;

/**
 * Lazy 加载并构建搜索索引
 * @description 多次调用复用同一 Promise；完成后直接同步返回缓存。每页按 zh / en 各存一份原始字段，结果列表按当前 i18n 语言挑对应桶，跨语言不互相污染
 */
export const loadSearchIndex = (): Promise<SearchIndex> => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const out: SearchIndex = {};
    await Promise.all(
      Object.entries(mdxLoaders).map(async ([key, loader]) => {
        if (!loader) return;
        const parsed = parseKey(key);
        if (!parsed) return;
        const raw = await loader();
        const page = extractIndexedPage(raw);
        const bucket = out[parsed.path] ?? (out[parsed.path] = {});
        bucket[parsed.lang] = page;
      }),
    );
    cached = out;
    pending = null;
    return out;
  })();
  return pending;
};
