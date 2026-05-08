import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { modules } from '../src/data/module';
import { getSectionsByModule } from '../src/data/sections';
import type { I18nKey } from '../src/data/interface';
import { en } from '../src/i18n/locales/en';

/**
 * 生成 llms.txt：站点文章索引，供 AI 工具发现页面。
 * - 标签走 en.ts 英文文案（llms.txt 习惯英文）
 * - description 从对应 index.en.mdx 的 frontmatter 提取，缺失则省略
 * - 嵌套页（page.children）展平为 "Parent / Child" 标题
 * - 空模块（flow / plot）跳过
 */

const SITE_URL = 'https://pionpill.github.io/retikz';
const SITE_TAGLINE = 'TikZ React adapter — author TikZ figures the React way.';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const DESCRIPTION_REGEX = /^description:\s*(.+?)\s*$/m;

type Item = { url: string; title: string; desc: string | null };

const t = (key: I18nKey): string => {
  const [ns, k] = key.split('.') as [keyof typeof en, string];
  return (en[ns] as Record<string, string>)[k] ?? key;
};

const readDescription = (mdxPath: string): string | null => {
  if (!existsSync(mdxPath)) return null;
  const fm = FRONTMATTER_REGEX.exec(readFileSync(mdxPath, 'utf-8'));
  if (!fm?.[1]) return null;
  const m = DESCRIPTION_REGEX.exec(fm[1]);
  return m?.[1]?.trim() ?? null;
};

const collect = (rootDir: string, moduleId: string): Array<Item> => {
  const out: Array<Item> = [];
  const pushItem = (parts: Array<string>, title: string) => {
    out.push({
      url: `${SITE_URL}/${parts.join('/')}`,
      title,
      desc: readDescription(path.resolve(rootDir, 'src/contents', ...parts, 'index.en.mdx')),
    });
  };

  for (const section of getSectionsByModule(moduleId)) {
    // ungrouped section（无 label）跳过 sectionId 段，URL/文件路径都不出现
    const sectionPart = section.label && section.id ? [section.id] : [];
    for (const page of section.pages) {
      if (!page.children) {
        pushItem([moduleId, ...sectionPart, page.id], t(page.label));
      } else {
        for (const child of page.children) {
          if (child.children) continue; // 路由只支持 2 级嵌套，更深的忽略
          pushItem([moduleId, ...sectionPart, page.id, child.id], `${t(page.label)} / ${t(child.label)}`);
        }
      }
    }
  }
  return out;
};

/** 生成 llms.txt 字符串内容 */
export const generateLlmsTxt = (rootDir: string): string => {
  const lines: Array<string> = ['# retikz', '', `> ${SITE_TAGLINE}`, ''];
  for (const mod of modules) {
    const items = collect(rootDir, mod.id);
    if (items.length === 0) continue;
    lines.push(`## ${t(mod.label)}`, '');
    for (const item of items) {
      lines.push(`- [${item.title}](${item.url})${item.desc ? `: ${item.desc}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
};

/**
 * 写到 apps/docs/public/llms.txt（被 vite copy 到 dist/llms.txt）。
 * 加 UTF-8 BOM：浏览器直访 `.txt` 时部分平台（中文 Windows 等）默认按 GBK 解，
 * 内容里的 em-dash / 中文会变乱码；BOM 让浏览器无歧义按 UTF-8 解码。
 */
const UTF8_BOM = String.fromCharCode(0xfeff);

export const writeLlmsTxt = (rootDir: string): void => {
  const out = path.resolve(rootDir, 'public/llms.txt');
  writeFileSync(out, UTF8_BOM + generateLlmsTxt(rootDir), 'utf-8');
};
