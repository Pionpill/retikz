import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { computeDocStats } from '@/modules/docs/lib/doc-stats';

describe('文档阅读统计', () => {
  it('只统计文本与行内代码，排除标记、属性、代码块和注释', () => {
    const source = [
      '---',
      'title: ignored',
      '---',
      '# 标题',
      '',
      '正文 **粗体** `Array` [链接](https://example.com)',
      '',
      '<ComponentAlert title="ignored > text">提示</ComponentAlert>',
      '',
      '{/* ignored <ComponentPreview /> */}',
      '',
      '```tsx',
      '<ComponentPreview />',
      '```',
      '',
      '~~~tsx',
      '<ComponentPreview />',
      '~~~',
      '',
      '<DocTabs><DocTab label="ignored"><ComponentPreview files="demo" /></DocTab></DocTabs>',
    ].join('\n');
    expect(computeDocStats(source, 'zh')).toEqual({ chars: 15, referenceChars: 0, examples: 1, readingMinutes: 1 });
  });

  it.each(['API 参考', 'API reference', 'Schema 参考', 'Schema reference'])(
    '将 %s 及其子章节归入参考，后续同级正文恢复计数',
    heading => {
      const source = `正文\n\n## ${heading}\n\n参考\n\n### Detail\n\n属性\n\n## End\n\n结尾`;
      const stats = computeDocStats(source, 'zh');
      expect(stats?.chars).toBe(7);
      expect(stats?.referenceChars).toBe(heading.replace(/\s/g, '').length + 10);
      expect(stats?.readingMinutes).toBe(1);
    },
  );

  it('表格只统计单元格文本，组件标签不增加阅读时间', () => {
    const source = '| 字段 | 含义 |\n| --- | --- |\n| `gap` | 间距 |\n\n' + '<ComponentPreview />\n\n'.repeat(80);
    expect(computeDocStats(source, 'zh')).toEqual({ chars: 9, referenceChars: 0, examples: 80, readingMinutes: 1 });
  });

  it('按语言阅读速度估算，参考章节不增加正文耗时', () => {
    const source = '文'.repeat(1000) + '\n\n## API reference\n\n' + '字'.repeat(5000);
    expect(computeDocStats(source, 'zh')?.readingMinutes).toBe(2);
    expect(computeDocStats('文'.repeat(700), 'zh')?.readingMinutes).toBe(2);
    expect(computeDocStats('a'.repeat(700), 'en')?.readingMinutes).toBe(1);
  });

  it('源码解析失败时不显示误导性统计', () => {
    expect(computeDocStats('<Broken', 'zh')).toBeNull();
  });

  it('Array 正文与生成的参考片段展开后仍分别计数', () => {
    const base = new URL('../src/modules/docs/contents/library/standard/collection/array/', import.meta.url);
    for (const lang of ['zh', 'en']) {
      const body = readFileSync(new URL(`index.${lang}.mdx`, base), 'utf8');
      const reference = readFileSync(new URL(`_includes/generated.${lang}.mdx`, base), 'utf8');
      const marker = /\{\/\*\s*@include[^}]+\*\/\}/;
      const original = computeDocStats(body.replace(marker, ''), lang);
      const expanded = computeDocStats(
        body.replace(marker, () => reference),
        lang,
      );
      expect(expanded).not.toBeNull();
      expect(expanded?.chars).toBe(original?.chars);
      expect(expanded?.examples).toBe(10);
      expect(expanded?.readingMinutes).toBe(original?.readingMinutes);
      expect(expanded!.referenceChars).toBeGreaterThan(original!.referenceChars);
    }
  });
});
