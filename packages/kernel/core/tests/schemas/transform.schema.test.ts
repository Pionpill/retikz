import { describe, expect, it } from 'vitest';

import { OffsetPositionSchema, TransformSchema } from '../../src/schemas';

describe('引用式平移输入', () => {
  it('偏移平移允许省略 offset，偏移位置仍要求显式 offset', () => {
    expect(TransformSchema.parse({ kind: 'offset-translate', of: 'A' })).toEqual({
      kind: 'offset-translate',
      of: 'A',
    });
    expect(OffsetPositionSchema.safeParse({ of: 'A' }).success).toBe(false);
  });
});
