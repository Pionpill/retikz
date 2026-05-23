import type { Lang } from '@/i18n';
import type { ChangeItem, Release } from '@/data/changelog.types';

const DEV_LABEL: Record<Lang, string> = { zh: '开发中', en: 'in development' };
/** label 与 content 之间的分隔:中文全角冒号,英文半角冒号 */
const SEP: Record<Lang, string> = { zh: '：', en: ':' };

const itemLines = (items: Array<ChangeItem>, lang: Lang, depth: number): Array<string> => {
  const lines: Array<string> = [];
  const indent = '  '.repeat(depth);
  for (const item of items) {
    lines.push(`${indent}- **${item.label[lang]}${SEP[lang]}** ${item.content[lang]}`);
    if (item.children?.length) lines.push(...itemLines(item.children, lang, depth + 1));
  }
  return lines;
};

/** 里程碑标题的日期后缀:有 stable 显日期,否则显"开发中" */
const releaseHeading = (minor: string, stableDate: string | null, lang: Lang): string => {
  const suffix = stableDate ?? DEV_LABEL[lang];
  return lang === 'zh' ? `## ${minor}（${suffix}）` : `## ${minor} (${suffix})`;
};

/** 结构化 changelog → markdown(当前语言),用于 AI 上下文与复制 */
export const changelogToMarkdown = (releases: Array<Release>, lang: Lang): string => {
  const blocks: Array<string> = [];
  for (const release of releases) {
    const parts: Array<string> = [releaseHeading(release.minor, release.stableDate, lang)];
    for (const pkg of release.packages) {
      parts.push(`### ${pkg.pkg} ${pkg.version}`, pkg.description[lang]);
      if (pkg.highlights.length) parts.push(itemLines(pkg.highlights, lang, 0).join('\n'));
      for (const sub of pkg.subVersions) {
        parts.push(`#### ${sub.version} — ${sub.date}`);
        if (sub.summary) parts.push(sub.summary[lang]);
        if (sub.items.length) parts.push(itemLines(sub.items, lang, 0).join('\n'));
      }
    }
    blocks.push(parts.join('\n\n'));
  }
  return blocks.join('\n\n');
};
