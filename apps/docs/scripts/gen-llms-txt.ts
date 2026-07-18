import { writeFileSync } from 'node:fs';
import path from 'node:path';

import type { I18nKey } from '../src/modules/docs/data';

import { en } from '../src/i18n/locales';
import { modules } from '../src/modules/docs/data';
import { collectDocManifest, writeDocArtifacts } from './docs-manifest';

const SITE_TAGLINE =
  'AI-native drawing and visualization toolkit with shared JSON IR, React and Vanilla authoring, and SVG or Canvas rendering.';

const translate = (key: I18nKey): string => {
  const [namespace, name] = key.split('.') as [keyof typeof en, string];
  return (en[namespace] as Record<string, string>)[name] ?? key;
};

/** 生成供外部 AI 发现原始文档、交互页面与页面职责的索引。 */
export const generateLlmsTxt = (rootDir: string): string => {
  const manifest = collectDocManifest(rootDir);
  const lines: Array<string> = [
    '# retikz',
    '',
    `> ${SITE_TAGLINE}`,
    '',
    'Each entry links to raw MDX that does not require JavaScript. Use the Interactive URL when a rendered demo or control panel is needed.',
    '',
    '- [Machine-readable manifest](https://pionpill.github.io/retikz/llms/manifest.json)',
    '',
  ];

  for (const module of modules) {
    const entries = manifest.filter(entry => entry.module === module.id);
    if (entries.length === 0) continue;
    lines.push(`## ${translate(module.label)}`, '');
    for (const entry of entries) {
      const localized = entry.content.en ?? entry.content.zh;
      if (localized === undefined) continue;
      const metadata = `type=${entry.pageType}; audience=${entry.audience}; capability=${entry.capability}`;
      const description = localized.description ? ` ${localized.description}` : '';
      lines.push(
        `- [${localized.title}](${localized.url}) (${metadata}).${description} Interactive: ${entry.interactiveUrl}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
};

const UTF8_BOM = String.fromCharCode(0xfeff);

/** 写出 llms.txt、JSON manifest 与原始双语 MDX。 */
export const writeLlmsTxt = (rootDir: string): void => {
  writeDocArtifacts(rootDir);
  writeFileSync(path.resolve(rootDir, 'public/llms.txt'), UTF8_BOM + generateLlmsTxt(rootDir), 'utf8');
};
