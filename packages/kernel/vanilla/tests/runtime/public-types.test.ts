import { describe, expect, it } from 'vitest';

import { VanillaViewMode } from '../../src/dom';

describe('Vanilla retained 公开类型', () => {
  it('公开稳定的 view mode const object', () => {
    expect(VanillaViewMode).toEqual({ Retained: 'retained', Static: 'static' });
  });
});
