import { describe, expect, it } from 'vitest';

import { parseHeadings } from '@/modules/docs/components/mdx-content/utils';
import { expandMdxIncludes } from '@/modules/docs/lib';

import { embedApiReferenceMdx } from '../../scripts/api-reference/embedded-reference';

const pages = import.meta.glob<string>('../../src/modules/docs/contents/**/index.{zh,en}.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const referenceTitles = new Set(['API 参考', 'api reference', 'Schema 参考', 'schema reference']);

describe('embedded API and Schema references', () => {
  it('projects package labels and public members while preserving code fences', () => {
    expect(
      embedApiReferenceMdx('## `@retikz/standard`\n\n### Array / ArrayProps\n\n```md\n### Code heading\n```'),
    ).toBe('**`@retikz/standard`**\n\n#### Array / ArrayProps\n\n```md\n### Code heading\n```');
  });

  it('keeps reference members out of the page TOC after expanding includes', async () => {
    const violations: Array<string> = [];
    let referenceCount = 0;

    for (const [path, source] of Object.entries(pages)) {
      const lang = path.endsWith('.zh.mdx') ? 'zh' : 'en';
      const headings = parseHeadings(await expandMdxIncludes(source, lang));
      let inReference = false;

      for (const heading of headings) {
        if (heading.level <= 2) {
          inReference = heading.level === 2 && referenceTitles.has(heading.text.toLowerCase());
          if (inReference) referenceCount++;
        } else if (inReference) {
          violations.push(`${path}: ${heading.text}`);
        }
      }
    }

    expect(referenceCount).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});
