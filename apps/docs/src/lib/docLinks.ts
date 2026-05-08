import type { DocLocation } from '@/pages/doc-page/docLocation';
import { docPathSegments } from '@/pages/doc-page/docLocation';

/** 仓库与分支常量：复制 markdown / 在 GitHub 查看 / 喂给 AI 的 raw URL 都要用 */
export const DOC_REPO = 'Pionpill/retikz';
export const DOC_BRANCH = 'main';

/** location → 仓库内 mdx 相对路径（含语言后缀） */
export const buildContentRelativePath = (segments: Array<string>, lang: string): string =>
  `apps/docs/src/contents/${segments.join('/')}/index.${lang}.mdx`;

export const buildBlobUrl = (relPath: string): string =>
  `https://github.com/${DOC_REPO}/blob/${DOC_BRANCH}/${relPath}`;
export const buildRawUrl = (relPath: string): string =>
  `https://raw.githubusercontent.com/${DOC_REPO}/${DOC_BRANCH}/${relPath}`;

/** AI 站点的 prompt 直传 URL，按当前界面语言出双语 prompt */
export const buildAiUrl = (base: string, rawUrl: string, lang: string): string => {
  const prompt =
    lang === 'zh'
      ? `请阅读这份 retikz 文档并帮我解答相关问题：${rawUrl}`
      : `Please read this retikz documentation and help with related questions: ${rawUrl}`;
  return `${base}?q=${encodeURIComponent(prompt)}`;
};

/** 一站式：从 DocLocation + 当前语言推出常用四个 URL（页签 / GitHub / raw / AI 提问要的 raw 同源） */
export type DocPageLinks = {
  relPath: string;
  blobUrl: string;
  rawUrl: string;
};

export const buildDocPageLinks = (loc: DocLocation, lang: string): DocPageLinks => {
  const relPath = buildContentRelativePath(docPathSegments(loc), lang);
  return {
    relPath,
    blobUrl: buildBlobUrl(relPath),
    rawUrl: buildRawUrl(relPath),
  };
};
