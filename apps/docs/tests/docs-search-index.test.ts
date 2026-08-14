import { describe, expect, it } from 'vitest';

import { loadSearchIndex } from '../src/modules/docs/components/docs-search/search-index';

describe('docs search index frontmatter', () => {
  it('解析带 BOM 的页面，并去除 YAML 标量引号', async () => {
    const index = await loadSearchIndex();

    expect(index['/kernel/get-start']?.zh?.description).toContain('安装 retikz');
    expect(index['/kernel/components/layout']?.en?.description.startsWith("'")).toBe(false);
  });

  it('索引 Chart 页面内联展开后的共享 API 标题', async () => {
    const index = await loadSearchIndex();

    expect(index['/viz/chart/points/scatter']?.zh?.headings).toEqual(
      expect.arrayContaining(['Chart authoring', 'Presentation', 'Runtime styles', 'Plot extensions']),
    );
    expect(index['/viz/chart/points/scatter']?.en?.headings).toEqual(
      expect.arrayContaining([
        'Chart authoring',
        'Presentation',
        'Runtime styles',
        'Plot extensions',
      ]),
    );
  });
});
