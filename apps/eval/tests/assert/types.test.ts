import { describe, expect, it } from 'vitest';
import { AssertionSchema } from '../../src/assert/types';

describe('AssertionSchema', () => {
  it('接受 textPresent', () => {
    expect(AssertionSchema.safeParse({ kind: 'textPresent', text: 'Hello' }).success).toBe(true);
  });
  it('接受 primitiveCount', () => {
    expect(
      AssertionSchema.safeParse({ kind: 'primitiveCount', primitive: 'rect', op: '>=', value: 2 })
        .success,
    ).toBe(true);
  });
  it('接受 arrowCount 与 stylePresent', () => {
    expect(AssertionSchema.safeParse({ kind: 'arrowCount', op: '>=', value: 1 }).success).toBe(true);
    expect(AssertionSchema.safeParse({ kind: 'stylePresent', style: 'dashed' }).success).toBe(true);
  });
  it('拒绝未知 kind', () => {
    expect(AssertionSchema.safeParse({ kind: 'spatial', a: 'x' }).success).toBe(false);
  });
  it('拒绝 primitiveCount 缺 op', () => {
    expect(
      AssertionSchema.safeParse({ kind: 'primitiveCount', primitive: 'rect', value: 1 }).success,
    ).toBe(false);
  });
});
