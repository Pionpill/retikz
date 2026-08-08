import { describe, expect, it } from 'vitest';

import { resolveDocLocation } from '@/modules/docs/layout/useDocLocation';

describe('resolveDocLocation', () => {
  it('将无分组父页的子页归一化为 page + subPage', () => {
    expect(
      resolveDocLocation({
        moduleId: 'diagram',
        sectionId: 'notation',
        pageId: 'logic-frame',
      }),
    ).toEqual({
      moduleId: 'diagram',
      sectionId: null,
      pageId: 'notation',
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
