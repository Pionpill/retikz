/**
 * ClipSpecSchema 校验测试
 * @description 覆盖裁剪区 4 种结构化形状（rect / circle / ellipse / polygon）各自的合法接受，
 *   与退化形态拒绝（尺寸 ≤ 0、非 finite、polygon 点数不足 / 点非二元组）；
 *   并验证 Scope schema 接受可选 clip 字段（向后兼容、缺省合法）。
 */
import { describe, expect, it } from 'vitest';
import { ClipSpecSchema, ScopeSchema } from '../../src/ir';

describe('ClipSpecSchema 合法形态', () => {
  it('rect 四字段齐全且尺寸正数', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 40, height: 30 });
    expect(parsed.success).toBe(true);
  });

  it('rect 接受负坐标但正尺寸', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: -10, y: -20, width: 5, height: 5 });
    expect(parsed.success).toBe(true);
  });

  it('circle 含 cx / cy / 正半径', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: 80 });
    expect(parsed.success).toBe(true);
  });

  it('ellipse 含 cx / cy / 正 rx / 正 ry', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'ellipse', cx: 5, cy: 5, rx: 30, ry: 20 });
    expect(parsed.success).toBe(true);
  });

  it('polygon 恰 3 点接受', () => {
    const parsed = ClipSpecSchema.safeParse({
      kind: 'polygon',
      points: [
        [0, 0],
        [10, 0],
        [5, 10],
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('polygon 多于 3 点接受', () => {
    const parsed = ClipSpecSchema.safeParse({
      kind: 'polygon',
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('ClipSpecSchema 退化 / 非法形态拒绝', () => {
  it('rect width 为 0 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 0, height: 30 });
    expect(parsed.success).toBe(false);
  });

  it('rect width 为负拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: -5, height: 30 });
    expect(parsed.success).toBe(false);
  });

  it('rect height 为 0 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 30, height: 0 });
    expect(parsed.success).toBe(false);
  });

  it('rect width 非 finite（Infinity）拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: Infinity, height: 10 });
    expect(parsed.success).toBe(false);
  });

  it('rect x 非 finite（NaN）拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: NaN, y: 0, width: 10, height: 10 });
    expect(parsed.success).toBe(false);
  });

  it('rect 缺 height 字段拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 10 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 为 0 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: 0 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 为负拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: -10 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 非 finite 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: Infinity });
    expect(parsed.success).toBe(false);
  });

  it('ellipse rx 为 0 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'ellipse', cx: 0, cy: 0, rx: 0, ry: 20 });
    expect(parsed.success).toBe(false);
  });

  it('ellipse ry 为负拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'ellipse', cx: 0, cy: 0, rx: 20, ry: -5 });
    expect(parsed.success).toBe(false);
  });

  it('polygon 仅 2 点拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({
      kind: 'polygon',
      points: [
        [0, 0],
        [10, 0],
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('polygon 空 points 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'polygon', points: [] });
    expect(parsed.success).toBe(false);
  });

  it('polygon 含三元组点拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({
      kind: 'polygon',
      points: [
        [0, 0],
        [10, 0],
        [5, 10, 1],
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('polygon 含非 finite 点坐标拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({
      kind: 'polygon',
      points: [
        [0, 0],
        [Infinity, 0],
        [5, 10],
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('未知 kind 拒绝', () => {
    const parsed = ClipSpecSchema.safeParse({ kind: 'triangle', x: 0, y: 0, width: 10, height: 10 });
    expect(parsed.success).toBe(false);
  });
});

describe('ScopeSchema 接受可选 clip 字段', () => {
  it('scope 带 circle clip 合法', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      clip: { kind: 'circle', cx: 0, cy: 0, r: 120 },
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 带 rect clip 合法', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      clip: { kind: 'rect', x: 0, y: 0, width: 100, height: 80 },
      children: [{ type: 'node', position: [0, 0] }],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 缺省 clip 仍合法（向后兼容）', () => {
    const parsed = ScopeSchema.safeParse({ type: 'scope', children: [] });
    expect(parsed.success).toBe(true);
  });

  it('scope 带退化 clip（rect width 0）拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      clip: { kind: 'rect', x: 0, y: 0, width: 0, height: 10 },
      children: [],
    });
    expect(parsed.success).toBe(false);
  });
});
