import { describe, expect, it } from 'vitest';

import { createIdAllocator } from '../src';

describe('ID 分配器', () => {
  it('连续分配不重复编号，前缀原样保留', () => {
    const ids = createIdAllocator('tree/scope');
    expect([ids.next(), ids.next(), ids.next()]).toEqual(['tree/scope-0', 'tree/scope-1', 'tree/scope-2']);
  });

  it('实例独立计数，不隐式保证跨实例唯一性', () => {
    const first = createIdAllocator('');
    const second = createIdAllocator('');
    expect(first.next()).toBe('-0');
    expect(first.next()).toBe('-1');
    expect(second.next()).toBe('-0');
    expect(createIdAllocator('other').next()).toBe('other-0');
  });
});
