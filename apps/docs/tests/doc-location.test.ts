import { describe, expect, it } from 'vitest';

import { resolveDocLocation } from '@/modules/docs/layout/useDocLocation';

describe('resolveDocLocation', () => {
  it('将 Notation 两段路径归一化为有落地页的 section', () => {
    expect(
      resolveDocLocation({
        moduleId: 'diagram',
        firstSeg: 'notation',
      }),
    ).toEqual({
      moduleId: 'diagram',
      sectionId: 'notation',
      pageId: null,
    });
  });

  it('保留 Notation 分组的 section + page + subPage 语义', () => {
    expect(
      resolveDocLocation({
        moduleId: 'diagram',
        sectionId: 'notation',
        pageId: 'composite',
        subPageId: 'logic-frame',
      }),
    ).toEqual({
      moduleId: 'diagram',
      sectionId: 'notation',
      pageId: 'composite',
      subPageId: 'logic-frame',
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
