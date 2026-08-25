import { describe, expect, it } from 'vitest';

import type { IRPath } from '../../src/schemas/path/path';

import { PathSchema } from '../../src/schemas/path/path';

/** 构造带 id 的最简合法 IRPath（两段 step，满足 children.min(2)） */
const pathWithId = (id: string): IRPath => ({
  type: 'path',
  id,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 5] },
  ],
});

describe('PathSchema.id 接受合法形态', () => {
  it('带非空白 id 的 path parse 成功且保留 id', () => {
    const parsed = PathSchema.safeParse(pathWithId('edge1'));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id).toBe('edge1');
  });

  it('省略 id（optional）的 path parse 成功且 id 为 undefined', () => {
    const parsed = PathSchema.safeParse({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 5] },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id).toBeUndefined();
  });
});

describe('PathSchema.id JSON round-trip 保 id', () => {
  it('含 id 的 IRPath 经 JSON.stringify/parse 往返后 parse 等于原 IR', () => {
    const original = pathWithId('edge1');
    const roundTripped = PathSchema.parse(JSON.parse(JSON.stringify(original)));
    expect(roundTripped).toEqual(original);
    expect(roundTripped.id).toBe('edge1');
  });
});

describe('PathSchema.id 拒绝非法形态', () => {
  it.each(['', '   '])('id=%j 为空白字符串时被拒绝并报告 id 路径', id => {
    const parsed = PathSchema.safeParse(pathWithId(id));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes('id'))).toBe(true);
    }
  });

  it.each(['', '   '])('PathSchema.parse 对空白 id=%j 直接抛异常', id => {
    expect(() => PathSchema.parse(pathWithId(id))).toThrow();
  });
});
