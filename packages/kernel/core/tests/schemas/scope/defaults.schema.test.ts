import { describe, expect, it } from 'vitest';

import { NodeDefaultSchema, NodeLabelDefaultSchema, PathDefaultSchema } from '../../../src/schemas';

describe('默认通道的稀疏派生', () => {
  it('已有标签和箭头配置不提前物化继承字段或创建实例内容', () => {
    const node = { label: { pin: false } };
    const path = { label: { interrupt: false }, arrow: { end: { fill: 0 } } };
    expect(NodeDefaultSchema.parse(node)).toEqual(node);
    expect(PathDefaultSchema.parse(path)).toEqual(path);
    expect(NodeLabelDefaultSchema.parse({})).toEqual({});
  });

  it('派生的标签默认仍执行 inside 与 pin 的互斥约束', () => {
    const invalid = { placement: 'inside', pin: true };
    expect(NodeLabelDefaultSchema.safeParse(invalid).success).toBe(false);
    expect(NodeDefaultSchema.safeParse({ label: invalid }).success).toBe(false);
    expect(NodeDefaultSchema.parse({ label: { ...invalid, pin: false } })).toEqual({
      label: { placement: 'inside', pin: false },
    });
  });
});
