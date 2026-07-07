import { describe, expect, it } from 'vitest';

import { resolveDocPageNode } from '@/modules/docs/layout/useDocPageNode';

describe('resolveDocPageNode', () => {
  it('解析无分组页面', () => {
    const node = resolveDocPageNode({ moduleId: 'kernel', sectionId: null, pageId: 'get-start' });
    expect(node.section?.label).toBeUndefined();
    expect(node.target?.id).toBe('get-start');
  });

  it('解析带子页的分组页面', () => {
    const node = resolveDocPageNode({
      moduleId: 'kernel',
      sectionId: 'components',
      pageId: 'layout',
      subPageId: 'overview',
    });
    expect(node.section?.id).toBe('components');
    expect(node.page?.id).toBe('layout');
    expect(node.target?.id).toBe('overview');
  });

  it('解析分组文档页面', () => {
    const node = resolveDocPageNode({ moduleId: 'viz', sectionId: 'data', pageId: null });
    expect(node.section?.id).toBe('data');
    expect(node.target?.id).toBe('data');
    expect(node.target?.label).toBe('viz.dataFlow');
  });

  it('缺失页面时返回空 target', () => {
    const node = resolveDocPageNode({ moduleId: 'kernel', sectionId: 'missing', pageId: 'missing' });
    expect(node.target).toBeUndefined();
  });
});
