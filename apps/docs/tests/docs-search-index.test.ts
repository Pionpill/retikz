import { describe, expect, it } from 'vitest';

import { loadSearchIndex } from '../src/modules/docs/components/docs-search/search-index';

describe('docs search index frontmatter', () => {
  it('解析带 BOM 的页面，并去除 YAML 标量引号', async () => {
    const index = await loadSearchIndex();

    expect(index['/kernel/get-start']?.zh?.description).toContain('安装 retikz');
    expect(index['/kernel/components/layout']?.en?.description.startsWith("'")).toBe(false);
  });

  it('分别索引 Scatter、Bubble 类型页与图形模型的共享主题', async () => {
    const index = await loadSearchIndex();

    expect(index['/viz/chart/points/scatter']?.zh?.headings).toContain('`ScatterEncodings`');
    expect(index['/viz/chart/points/scatter']?.en?.headings).toContain('`ScatterEncodings`');
    expect(index['/viz/chart/points/bubble']?.zh?.headings).toContain('`BubbleEncodings`');
    expect(index['/viz/chart/points/bubble']?.en?.headings).toContain('`BubbleEncodings`');
    expect(index['/viz/chart/model/authoring']?.zh?.headings).toEqual(
      expect.arrayContaining(['一条共享主链', '三套包，各自只做一段']),
    );
    expect(index['/viz/chart/model/authoring']?.en?.headings).toEqual(
      expect.arrayContaining(['One shared pipeline', 'Three packages, one stage each']),
    );
    expect(index['/viz/chart/model/presentation']?.zh?.headings).toContain('固定槽位与 canonical 顺序');
    expect(index['/viz/chart/model/plot']?.zh?.headings).toContain('两个 owner，一张完整图形');
  });
});
