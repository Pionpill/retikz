import { describe, expect, it } from 'vitest';

import { resolveDocNavigationContext } from '@/modules/docs/layout/resolve-doc-navigation-context';
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
        pageId: 'entity',
        subPageId: 'basic',
      }),
    ).toEqual({
      moduleId: 'schematic',
      sectionId: 'graph',
      pageId: 'entity',
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

  it('将无分组页面保留为有内容的位置，而不是模块主页', () => {
    expect(
      resolveDocLocation({
        moduleId: 'viz',
        firstSeg: 'get-start',
      }),
    ).toEqual({
      moduleId: 'viz',
      sectionId: null,
      pageId: 'get-start',
    });
  });

  it('将 About 页面识别为特殊 navigation area', () => {
    expect(
      resolveDocLocation({
        moduleId: 'about',
        firstSeg: 'overview',
      }),
    ).toEqual({
      moduleId: 'about',
      sectionId: null,
      pageId: 'overview',
    });
  });
});

describe('resolveDocNavigationContext', () => {
  it('区分首页、模块主页、无分组页面和 About 页面上下文', () => {
    expect(resolveDocNavigationContext('/')).toEqual({
      areaId: null,
      moduleId: null,
      sectionId: null,
      location: null,
    });
    expect(resolveDocNavigationContext('/viz')).toEqual({
      areaId: 'viz',
      moduleId: 'viz',
      sectionId: null,
      location: null,
    });
    expect(resolveDocNavigationContext('/viz/get-start')).toEqual({
      areaId: 'viz',
      moduleId: 'viz',
      sectionId: null,
      location: {
        moduleId: 'viz',
        sectionId: null,
        pageId: 'get-start',
      },
    });
    expect(resolveDocNavigationContext('/about/overview')).toEqual({
      areaId: 'about',
      moduleId: null,
      sectionId: null,
      location: {
        moduleId: 'about',
        sectionId: null,
        pageId: 'overview',
      },
    });
    expect(resolveDocNavigationContext('/viz/chart/points/scatter')).toEqual({
      areaId: 'viz',
      moduleId: 'viz',
      sectionId: 'chart',
      location: {
        moduleId: 'viz',
        sectionId: 'chart',
        pageId: 'points',
        subPageId: 'scatter',
      },
    });
  });
});
