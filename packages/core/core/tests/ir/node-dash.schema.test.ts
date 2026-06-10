import { describe, expect, it } from 'vitest';
import { NodeDefaultSchema, NodeSchema } from '../../src/ir';

describe('Node dashPattern schema', () => {
  it('接受 dashPattern 作为节点显式虚线字段', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        dashPattern: [4, 2],
      }).success,
    ).toBe(true);
  });

  it('拒绝旧字段 dashArray', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        dashArray: [4, 2],
      }).success,
    ).toBe(false);
  });

  it('nodeDefault 同步接受 dashPattern 且拒绝 dashArray', () => {
    expect(NodeDefaultSchema.safeParse({ dashPattern: [4, 2] }).success).toBe(true);
    expect(NodeDefaultSchema.safeParse({ dashArray: [4, 2] }).success).toBe(false);
  });
});
