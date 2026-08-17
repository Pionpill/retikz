import { describe, expect, it } from 'vitest';

import { resolveDocLocation } from '@/modules/docs/layout/useDocLocation';

describe('resolveDocLocation', () => {
  it('将 Graph 两段路径归一化为有落地页的 section', () => {
    expect(
      resolveDocLocation({
        moduleId: 'schematic',
        firstSeg: 'graph',
      }),
    ).toEqual({
      moduleId: 'schematic',
      sectionId: 'graph',
      pageId: null,
    });
  });

  it('保留 Graph 分组的 section + page + subPage 语义', () => {
    expect(
      resolveDocLocation({
        moduleId: 'schematic',
        sectionId: 'graph',
        pageId: 'container',
        subPageId: 'basic',
      }),
    ).toEqual({
      moduleId: 'schematic',
      sectionId: 'graph',
      pageId: 'container',
      subPageId: 'basic',
    });
  });

  it('保留有分组页面的 section + page 语义', () => {
    expect(
      resolveDocLocation({
        moduleId: 'kernel',
        sectionId: 'components',
        pageId: 'node',
      }),
    ).toEqual({
      moduleId: 'kernel',
      sectionId: 'components',
      pageId: 'node',
    });
  });
});
