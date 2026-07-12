import { describe, expect, it } from 'vitest';

import { resolvePreviewCodeVisible } from '../../src/modules/docs/components/component-preview/utils';

describe('resolvePreviewCodeVisible', () => {
  it('全局隐藏优先于卡片本地状态', () => {
    expect(resolvePreviewCodeVisible(true, true)).toBe(false);
    expect(resolvePreviewCodeVisible(false, true)).toBe(true);
    expect(resolvePreviewCodeVisible(false, undefined)).toBe(false);
  });
});
