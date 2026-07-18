import { describe, expect, it } from 'vitest';

import { loadSearchIndex } from '../src/modules/docs/components/docs-search/search-index';

describe('docs search index frontmatter', () => {
  it('解析带 BOM 的页面，并去除 YAML 标量引号', async () => {
    const index = await loadSearchIndex();

    expect(index['/kernel/get-start']?.zh?.description).toContain('安装 retikz');
    expect(index['/kernel/components/layout']?.en?.description.startsWith("'")).toBe(false);
  });
});
