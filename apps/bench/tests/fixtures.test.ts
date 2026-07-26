import { describe, expect, it } from 'vitest';

import { createSimpleNodeScene } from '../src/fixtures';

describe('benchmark fixtures', () => {
  it('按数量生成稳定且唯一的 entity id', () => {
    const first = createSimpleNodeScene(100);
    const second = createSimpleNodeScene(100);

    expect(first).toEqual(second);
    expect(first.children).toHaveLength(100);
    expect(new Set(first.children.map(child => ('id' in child ? child.id : undefined))).size).toBe(100);
  });

  it('拒绝非正 safe integer 数量', () => {
    expect(() => createSimpleNodeScene(0)).toThrow(/count/i);
    expect(() => createSimpleNodeScene(1.5)).toThrow(/count/i);
  });
});
