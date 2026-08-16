import { describe, expect, it } from 'vitest';

import { ClipSchema, ScopeSchema } from '../../src/schemas';

describe('ClipSchema 合法形态', () => {
  it('rect 四字段齐全且尺寸正数', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 40, height: 30 });
    expect(parsed.success).toBe(true);
  });

  it('rect 接受负坐标但正尺寸', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: -10, y: -20, width: 5, height: 5 });
    expect(parsed.success).toBe(true);
  });

  it('circle 含 cx / cy / 正半径', () => {
    const parsed = ClipSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: 80 });
    expect(parsed.success).toBe(true);
  });

  it('ellipse 含 cx / cy / 正 rx / 正 ry', () => {
    const parsed = ClipSchema.safeParse({ kind: 'ellipse', cx: 5, cy: 5, rx: 30, ry: 20 });
    expect(parsed.success).toBe(true);
  });
});

describe('ClipSchema 退化 / 非法形态拒绝', () => {
  it('rect width 为 0 拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 0, height: 30 });
    expect(parsed.success).toBe(false);
  });

  it('rect width 为负拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: -5, height: 30 });
    expect(parsed.success).toBe(false);
  });

  it('rect height 为 0 拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 30, height: 0 });
    expect(parsed.success).toBe(false);
  });

  it('rect width 非 finite（Infinity）拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: Infinity, height: 10 });
    expect(parsed.success).toBe(false);
  });

  it('rect x 非 finite（NaN）拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: NaN, y: 0, width: 10, height: 10 });
    expect(parsed.success).toBe(false);
  });

  it('rect 缺 height 字段拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 10 });
    expect(parsed.success).toBe(false);
  });

  it('rect 未知字段拒绝，不静默剥离', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 10, height: 10, opacity: 0.5 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 为 0 拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: 0 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 为负拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: -10 });
    expect(parsed.success).toBe(false);
  });

  it('circle r 非 finite 拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'circle', cx: 0, cy: 0, r: Infinity });
    expect(parsed.success).toBe(false);
  });

  it('ellipse rx 为 0 拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'ellipse', cx: 0, cy: 0, rx: 0, ry: 20 });
    expect(parsed.success).toBe(false);
  });

  it('ellipse ry 为负拒绝', () => {
    const parsed = ClipSchema.safeParse({ kind: 'ellipse', cx: 0, cy: 0, rx: 20, ry: -5 });
    expect(parsed.success).toBe(false);
  });

  it('polygon 与 path 作为开放 provider spec 保留给注册表校验', () => {
    expect(ClipSchema.safeParse({ kind: 'polygon', points: [] }).success).toBe(true);
    expect(
      ClipSchema.safeParse({ kind: 'path', commands: [{ kind: 'move', to: [0, 0], typo: true }] }).success,
    ).toBe(true);
  });

  it('compound 作为开放的自定义 clip spec 通过 Core schema', () => {
    const parsed = ClipSchema.safeParse({
      kind: 'compound',
      children: [{ kind: 'circle', cx: 0, cy: 0, r: 10 }],
      extra: 'preserved for the registered provider schema',
    });
    expect(parsed.success).toBe(true);
  });

  it('custom kind 接受 JSON-safe 对象，具体语义由 compile 的 clips provider 校验', () => {
    const parsed = ClipSchema.safeParse({ kind: 'triangle', x: 0, y: 0, width: 10, height: 10 });
    expect(parsed.success).toBe(true);
  });

  it('builtin kind 形态错误时不回退成 custom clip', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', x: 0, y: 0, width: 10 });
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
