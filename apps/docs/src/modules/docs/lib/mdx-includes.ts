import type { Lang } from '@/i18n';

import { LANGS } from '@/i18n';

/** 异步读取一份原始 MDX 片段 */
export type MdxIncludeLoader = () => Promise<string>;

/** MDX include 源文件路径与加载器 */
export type MdxIncludeEntry = readonly [path: string, loader: MdxIncludeLoader | undefined];

/** 按稳定名称与语言索引的 MDX include 注册表 */
export type MdxIncludeRegistry = ReadonlyMap<string, Partial<Record<Lang, MdxIncludeLoader>>>;

// 片段只从 `_includes` 收集，不会与只认 `index.<lang>.mdx` 的页面路由混合
const includeLoaders: Record<string, MdxIncludeLoader | undefined> = import.meta.glob<string>(
  '../contents/**/_includes/*.mdx',
  {
    query: '?raw',
    import: 'default',
  },
);

const includeMarkerPattern = /\{\/\*\s*@include\s+([a-z0-9][a-z0-9/_-]*)\s*\*\/\}/g;
const includePathPattern = /^\.\.\/contents\/(.+)\/_includes\/([^/]+)\.([a-z]+)\.mdx$/;

const isLang = (value: string): value is Lang => LANGS.some(lang => lang === value);

/**
 * 从受控源列表构建 include 注册表
 * @description 同一稳定名称与语言只允许一个源文件，冲突时立即失败
 */
export const createMdxIncludeRegistry = (entries: ReadonlyArray<MdxIncludeEntry>): MdxIncludeRegistry => {
  const registry = new Map<string, Partial<Record<Lang, MdxIncludeLoader>>>();

  for (const [path, loader] of entries) {
    if (!loader) continue;
    const match = path.match(includePathPattern);
    if (!match) throw new Error(`Invalid MDX include source path "${path}"`);

    const lang = match[3];
    if (!isLang(lang)) throw new Error(`Unsupported MDX include language "${lang}" in "${path}"`);

    const name = `${match[1]}/${match[2]}`;
    const sources = registry.get(name) ?? {};
    if (sources[lang]) throw new Error(`Duplicate MDX include "${name}" for language "${lang}"`);
    sources[lang] = loader;
    registry.set(name, sources);
  }

  return registry;
};

let defaultRegistry: MdxIncludeRegistry | null = null;

const getDefaultRegistry = (): MdxIncludeRegistry => {
  defaultRegistry ??= createMdxIncludeRegistry(Object.entries(includeLoaders));
  return defaultRegistry;
};

/**
 * 在 MDX 编译前内联当前语言的共享 Markdown 片段
 * @description marker 按原始顺序展开；未知名称或缺少对应语言时返回 rejected promise
 */
export const expandMdxIncludes = async (
  source: string,
  lang: Lang,
  registry: MdxIncludeRegistry = getDefaultRegistry(),
): Promise<string> => {
  let expanded = '';
  let cursor = 0;

  for (const match of source.matchAll(includeMarkerPattern)) {
    const index = match.index;
    const name = match[1];
    const sources = registry.get(name);
    if (!sources) throw new Error(`Unknown MDX include "${name}"`);
    const loader = sources[lang];
    if (!loader) throw new Error(`MDX include "${name}" has no "${lang}" source`);

    expanded += source.slice(cursor, index);
    expanded += await loader();
    cursor = index + match[0].length;
  }

  return expanded + source.slice(cursor);
};
