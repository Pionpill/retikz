import { describe, expect, it } from 'vitest';
import { CoordinateSchema, NodeSchema, PathSchema, ScopeSchema, TargetSchema } from '../../src/ir';

describe('IR numeric constraints', () => {
  it('node/path/scope strokeWidth 拒绝非有限数和负数', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], strokeWidth: Infinity }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], strokeWidth: -1 }).success).toBe(false);
    expect(PathSchema.safeParse({ type: 'path', strokeWidth: NaN, children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: [1, 1] }] }).success).toBe(false);
    expect(PathSchema.safeParse({ type: 'path', strokeWidth: -1, children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: [1, 1] }] }).success).toBe(false);
    expect(ScopeSchema.safeParse({ type: 'scope', strokeWidth: Infinity, children: [] }).success).toBe(false);
    expect(ScopeSchema.safeParse({ type: 'scope', strokeWidth: -1, children: [] }).success).toBe(false);
  });

  it('node rotate 拒绝非有限数', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], rotate: Infinity }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], rotate: NaN }).success).toBe(false);
  });

  it('path relative target 拒绝非有限数', () => {
    expect(TargetSchema.safeParse({ relative: [Infinity, 0] }).success).toBe(false);
    expect(TargetSchema.safeParse({ relative: [0, NaN] }).success).toBe(false);
    expect(TargetSchema.safeParse({ relativeAccumulate: [Infinity, 0] }).success).toBe(false);
    expect(TargetSchema.safeParse({ relativeAccumulate: [0, NaN] }).success).toBe(false);
  });

  it('合法的零宽描边、有限旋转和相对坐标仍被接受', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], strokeWidth: 0, rotate: -45 }).success).toBe(true);
    expect(PathSchema.safeParse({ type: 'path', strokeWidth: 0, children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: { relative: [1, -1] } }] }).success).toBe(true);
    expect(ScopeSchema.safeParse({ type: 'scope', strokeWidth: 0, children: [] }).success).toBe(true);
  });

  it('bend step 的 bendAngle 限定开区间 (-180, 180)：±180 被拒、179 接受', () => {
    const bendPath = (bendAngle: number): boolean =>
      PathSchema.safeParse({
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle },
        ],
      }).success;
    expect(bendPath(180)).toBe(false);
    expect(bendPath(-180)).toBe(false);
    expect(bendPath(179)).toBe(true);
  });

  it('Path / Coordinate / Scope 现为 strict：未知 / 拼错字段被拒（与 Node 一致）', () => {
    expect(
      PathSchema.safeParse({
        type: 'path',
        bogus: 1,
        children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: [1, 1] }],
      }).success,
    ).toBe(false);
    expect(CoordinateSchema.safeParse({ type: 'coordinate', id: 'c', position: [0, 0], bogus: 1 }).success).toBe(false);
    expect(ScopeSchema.safeParse({ type: 'scope', children: [], bogus: 1 }).success).toBe(false);
  });
});
