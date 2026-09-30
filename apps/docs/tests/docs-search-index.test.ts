import { describe, expect, it } from 'vitest';

import { buildSearchEntries } from '../src/modules/docs/components/docs-search/search-engine';
import { loadSearchIndex } from '../src/modules/docs/components/docs-search/search-index';

describe('docs search index frontmatter', () => {
  it('解析带 BOM 的页面，并去除 YAML 标量引号', async () => {
    const index = await loadSearchIndex();

    expect(index['/kernel/components/get-start']?.zh?.description).toContain('安装 retikz');
    expect(index['/kernel/components/layout']?.en?.description.startsWith("'")).toBe(false);
  });

  it('分别索引 Scatter、Bubble 类型页与图形模型的共享主题', async () => {
    const index = await loadSearchIndex();

    expect(index['/viz/chart/points/scatter']?.zh?.headings).toContain('基础用法');
    expect(index['/viz/chart/points/scatter']?.en?.headings).toContain('Basic usage');
    expect(index['/viz/chart/points/bubble']?.zh?.headings).toContain('基础用法');
    expect(index['/viz/chart/points/bubble']?.en?.headings).toContain('Basic usage');
    expect(index['/viz/chart/model/general-structure']?.zh?.headings).toContain('图形展示');
    expect(index['/viz/chart/model/core-structure']?.zh?.headings).toContain('叠加图元：marks');
    expect(index['/viz/chart/model/authoring']).toBeUndefined();
    expect(index['/viz/chart/model/plot']).toBeUndefined();
  });

  it('About 从模块列表移除后仍进入搜索条目', () => {
    const entries = buildSearchEntries((key: string) => key, {}, 'zh');

    expect(entries.find(entry => entry.path === '/about/introduction')).toMatchObject({
      label: 'about.introduction',
      moduleLabel: 'about.label',
    });
  });
});
