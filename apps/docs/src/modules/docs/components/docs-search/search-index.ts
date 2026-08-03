import type { Lang } from '@/i18n';

import { LANGS } from '@/i18n';
import { expandMdxIncludes, parseDocSource } from '@/modules/docs/lib';

type MdxLoader = () => Promise<string>;

const mdxLoaders: Record<string, MdxLoader | undefined> = import.meta.glob<string>('../../contents/**/*.mdx', {
  query: '?raw',
  import: 'default',
});

const parseKey = (key: string): { path: string; lang: Lang } | null => {
  const match = key.match(/\/contents\/(.+)\/index\.([a-z]+)\.mdx$/);
  if (!match) return null;
  const candidate = match[2] as Lang;
  if (!LANGS.includes(candidate)) return null;
  return { path: `/${match[1]}`, lang: candidate };
};

/** 一页 mdx 抽取出的可索引字段。 */
export type IndexedPage = {
  description: string;
  headings: ReadonlyArray<string>;
  inlineCodes: ReadonlyArray<string>;
};

const extractIndexedPage = (raw: string): IndexedPage => {
  const { frontmatter, body } = parseDocSource(raw);

  const headings: Array<string> = [];
  for (const headingMatch of body.matchAll(/^#{2,3}\s+(.+)$/gm)) {
    headings.push(headingMatch[1].trim());
  }

  const inlineCodes: Array<string> = [];
  for (const inlineMatch of body.matchAll(/`([^`\n]+)`/g)) {
    inlineCodes.push(inlineMatch[1].trim());
  }

  return { description: frontmatter.description, headings, inlineCodes };
};

export type SearchIndex = Partial<Record<string, Partial<Record<Lang, IndexedPage>>>>;

let cached: SearchIndex | null = null;
let pending: Promise<SearchIndex> | null = null;

/** Lazy 加载并构建搜索索引。 */
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
        const expanded = await expandMdxIncludes(raw, parsed.lang);
        const page = extractIndexedPage(expanded);
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
