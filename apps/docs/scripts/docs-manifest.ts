import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
  DocAudience,
  DocPageMetadata,
  DocPageMetadataOverride,
  DocPageType,
  DocSourceOfTruth,
  I18nKey,
  Section,
  SubPage,
} from '../src/modules/docs/data';

import { en, zh } from '../src/i18n/locales';
import { getSectionsByModule, modules } from '../src/modules/docs/data';
// Vite config 在 `@` alias 建立前加载生成器，因此构建工具直接导入纯函数 owner 文件
import { parseDocSource } from '../src/modules/docs/lib/frontmatter';

export const DOCS_SITE_URL = 'https://pionpill.github.io/retikz';

type DocLanguage = 'zh' | 'en';

/** manifest 中单个语言的文档入口。 */
export type DocLanguageEntry = {
  title: string;
  description: string;
  url: string;
  source: string;
};

/** 与页面一起提供给 LLM 的 demo、data、controls 或静态源码。 */
export type DocAssetEntry = {
  url: string;
  source: string;
};

/** 导航、frontmatter 与显式覆盖归一后的机器文档条目。 */
export type DocManifestEntry = DocPageMetadata & {
  id: string;
  module: string;
  path: string;
  interactiveUrl: string;
  content: Partial<Record<DocLanguage, DocLanguageEntry>>;
  assets: Array<DocAssetEntry>;
};

type RouteDocument = {
  parts: Array<string>;
  sectionId: string | undefined;
  label: I18nKey;
  meta: DocPageMetadataOverride | undefined;
  group: boolean;
};

const locales = { zh, en } as const;

const translate = (lang: DocLanguage, key: I18nKey): string => {
  const [namespace, name] = key.split('.') as [keyof (typeof locales)[DocLanguage], string];
  return (locales[lang][namespace] as Record<string, string>)[name] ?? key;
};

const collectRouteDocuments = (moduleId: string, sections: Array<Section>): Array<RouteDocument> => {
  const documents: Array<RouteDocument> = [];
  const visit = (node: SubPage, prefix: Array<string>, sectionId: string | undefined) => {
    const parts = [...prefix, node.id];
    documents.push({
      parts,
      sectionId,
      label: node.label,
      meta: node.meta,
      group: node.children !== undefined,
    });
    for (const child of node.children ?? []) visit(child, parts, sectionId);
  };

  for (const section of sections) {
    const sectionPrefix = section.id && section.label ? [moduleId, section.id] : [moduleId];
    if (section.document && section.id && section.label) {
      documents.push({
        parts: sectionPrefix,
        sectionId: section.id,
        label: section.label,
        meta: undefined,
        group: true,
      });
    }
    for (const page of section.pages) visit(page, sectionPrefix, section.id);
  }
  return documents;
};

const inferPageType = (document: RouteDocument): DocPageType => {
  if (document.meta?.pageType) return document.meta.pageType;
  if (document.group) return 'group';
  if (document.sectionId === undefined) return 'entry';
  switch (document.sectionId) {
    case 'concepts':
      return 'concept';
    case 'components':
      return 'component';
    case 'packages':
      return 'package';
    case 'reference':
      return 'reference';
    case 'examples':
      return 'example';
    case 'releases':
      return 'release';
    case 'blog':
      return 'blog';
    default:
      return 'guide';
  }
};

const inferAudience = (pageType: DocPageType): DocAudience => {
  if (pageType === 'extension') return 'extension-author';
  if (pageType === 'architecture' || pageType === 'release') return 'maintainer';
  if (pageType === 'reference') return 'integrator';
  return 'user';
};

const inferSourceOfTruth = (document: RouteDocument, pageType: DocPageType): DocSourceOfTruth => {
  if (document.meta?.sourceOfTruth) return document.meta.sourceOfTruth;
  if (pageType === 'architecture') return 'architecture';
  if (pageType === 'release') return 'changelog';
  if (pageType === 'reference' && document.parts.includes('schema')) return 'schema';
  if (pageType === 'reference') return 'runtime';
  return 'docs';
};

const toPosix = (value: string): string => value.replaceAll(path.sep, '/');

/** 收集站点导航中存在正文的页面，并归一为语言无关 manifest。 */
export const collectDocManifest = (rootDir: string): Array<DocManifestEntry> => {
  const entries: Array<DocManifestEntry> = [];
  for (const module of modules) {
    const documents = collectRouteDocuments(module.id, getSectionsByModule(module.id));
    for (const document of documents) {
      const content: Partial<Record<DocLanguage, DocLanguageEntry>> = {};
      for (const lang of ['zh', 'en'] as const) {
        const sourcePath = path.resolve(rootDir, 'src/modules/docs/contents', ...document.parts, `index.${lang}.mdx`);
        if (!existsSync(sourcePath)) continue;
        const source = readFileSync(sourcePath, 'utf8');
        const { frontmatter } = parseDocSource(source);
        content[lang] = {
          title: frontmatter.title || translate(lang, document.label),
          description: frontmatter.description,
          url: `${DOCS_SITE_URL}/llms/${document.parts.join('/')}/index.${lang}.mdx`,
          source: toPosix(path.relative(rootDir, sourcePath)),
        };
      }
      if (content.zh === undefined && content.en === undefined) continue;

      const contentDir = path.resolve(rootDir, 'src/modules/docs/contents', ...document.parts);
      const assets = readdirSync(contentDir, { withFileTypes: true })
        .filter(
          entry =>
            entry.isFile() && !/^index\.(zh|en)\.mdx$/.test(entry.name) && /\.(?:json|md|mdx|ts|tsx)$/.test(entry.name),
        )
        .map(entry => {
          const sourcePath = path.resolve(contentDir, entry.name);
          return {
            url: `${DOCS_SITE_URL}/llms/${document.parts.join('/')}/${entry.name}`,
            source: toPosix(path.relative(rootDir, sourcePath)),
          };
        })
        .sort((left, right) => left.source.localeCompare(right.source));

      const pageType = inferPageType(document);
      const route = `/${document.parts.join('/')}`;
      entries.push({
        id: document.parts.join('.'),
        module: module.id,
        path: route,
        interactiveUrl: `${DOCS_SITE_URL}${route}`,
        pageType,
        audience: document.meta?.audience ?? inferAudience(pageType),
        capability: document.meta?.capability ?? document.parts.join('.'),
        sourceOfTruth: inferSourceOfTruth(document, pageType),
        content,
        assets,
      });
    }
  }
  return entries;
};

/** 写出 JSON manifest 与不依赖 SPA 的原始 MDX。 */
export const writeDocArtifacts = (rootDir: string, outDir = path.resolve(rootDir, 'public/llms')): void => {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOut = path.resolve(outDir);
  if (resolvedOut === resolvedRoot || resolvedRoot.startsWith(`${resolvedOut}${path.sep}`)) {
    throw new Error(`Refusing to replace unsafe docs artifact directory: ${resolvedOut}`);
  }

  const manifest = collectDocManifest(rootDir);
  rmSync(resolvedOut, { recursive: true, force: true });
  mkdirSync(resolvedOut, { recursive: true });
  for (const entry of manifest) {
    for (const [lang, localized] of Object.entries(entry.content) as Array<[DocLanguage, DocLanguageEntry]>) {
      const target = path.resolve(resolvedOut, ...entry.path.split('/').filter(Boolean), `index.${lang}.mdx`);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(path.resolve(rootDir, localized.source), 'utf8'), 'utf8');
    }
    for (const asset of entry.assets) {
      const target = path.resolve(resolvedOut, ...entry.path.split('/').filter(Boolean), path.basename(asset.source));
      writeFileSync(target, readFileSync(path.resolve(rootDir, asset.source)));
    }
  }
  writeFileSync(path.resolve(resolvedOut, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};
