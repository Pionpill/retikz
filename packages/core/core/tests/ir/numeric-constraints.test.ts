import { describe, expect, it } from 'vitest';
import { NodeSchema, PathSchema, ScopeSchema, TargetSchema } from '../../src/ir';

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
});
