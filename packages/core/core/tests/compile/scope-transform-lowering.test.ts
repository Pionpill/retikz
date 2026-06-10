/**
 * `lowerScopeTransforms` 单元测试
 * @description 直接驱动 IR 层 4 种 translate 变体下沉为 Scene Cartesian translate；
 *   referent 未解析返回 null（compile.ts 上游负责发 warn）；rotate/scale 透传
 */
import { describe, expect, it } from 'vitest';
import type { IRTransform } from '../../src/ir';
import { NameStack } from '../../src/compile/name-stack';
import { type NodeLayout } from '../../src/compile/node';
import { lowerScopeTransforms, projectLayoutToGlobal } from '../../src/compile/scope';
import { BUILTIN_SHAPES } from '../../src/shapes';

/** 把 id → 中心 entries 灌进新建的 NameStack，便于 lower 单测验证 referent lookup */
const makeStack = (entries: Array<[string, [number, number]]>): NameStack => {
  const stack = new NameStack();
  for (const [id, [x, y]] of entries) {
    const layout: NodeLayout = {
      id,
      shapeName: 'rectangle',
      shapeDef: BUILTIN_SHAPES.rectangle,
      rect: { x, y, width: 0, height: 0, rotate: 0 },
      rotateDeg: 0,
      margin: 0,
      textWidth: 0,
      textHeight: 0,
      align: 'middle',
      lineHeight: 0,
      fontSize: 0,
      shapes: BUILTIN_SHAPES,
    };
    stack.register(id, layout);
  }
  return stack;
};

const layoutForProjection = (): NodeLayout => ({
  id: 'A',
  shapeName: 'rectangle',
  shapeDef: BUILTIN_SHAPES.rectangle,
  rect: { x: 10, y: 20, width: 30, height: 40, rotate: 0 },
  rotateDeg: 0,
  margin: 2,
  textWidth: 30,
  textHeight: 40,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes: BUILTIN_SHAPES,
});

describe('lowerScopeTransforms 4 translate 变体', () => {
  it('translate 直接透传', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'translate', x: 5, y: 3 }],
      new NameStack(),
    );
    expect(out).toEqual([{ kind: 'translate', x: 5, y: 3 }]);
  });

  it('polar-translate 不带 origin lower 成笛卡尔', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'polar-translate', angle: 0, radius: 50 }],
      new NameStack(),
    );
    expect(out).not.toBeNull();
    expect(out![0]).toMatchObject({ kind: 'translate' });
    const t = out![0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(50, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 带 origin=string id', () => {
    const idx = makeStack([['A', [10, 0]]]);
    const out = lowerScopeTransforms(
      [{ kind: 'polar-translate', origin: 'A', angle: 0, radius: 30 }],
      idx,
    );
    expect(out).not.toBeNull();
    const t = out![0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(40, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 带 origin=笛卡尔', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'polar-translate', origin: [10, 5], angle: 90, radius: 20 }],
      new NameStack(),
    );
    expect(out).not.toBeNull();
    const t = out![0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(10, 6);
    expect(t.y).toBeCloseTo(25, 6);
  });

  it('polar-translate radius=0 等价 translate(0, 0)', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'polar-translate', angle: 45, radius: 0 }],
      new NameStack(),
    );
    const t = out![0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(0, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate angle=360 与 angle=0 数值结果一致', () => {
    const a = lowerScopeTransforms(
      [{ kind: 'polar-translate', angle: 360, radius: 50 }],
      new NameStack(),
    );
    const b = lowerScopeTransforms(
      [{ kind: 'polar-translate', angle: 0, radius: 50 }],
      new NameStack(),
    );
    expect((a![0] as { x: number; y: number }).x).toBeCloseTo(
      (b![0] as { x: number; y: number }).x,
      6,
    );
    expect((a![0] as { x: number; y: number }).y).toBeCloseTo(
      (b![0] as { x: number; y: number }).y,
      6,
    );
  });

  it('at-translate 含 distance lower 成笛卡尔', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lowerScopeTransforms(
      [{ kind: 'at-translate', direction: 'right', of: 'A', distance: 20 }],
      idx,
    );
    expect(out![0]).toEqual({ kind: 'translate', x: 20, y: 0 });
  });

  it('at-translate 缺 distance 走 nodeDistance', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lowerScopeTransforms(
      [{ kind: 'at-translate', direction: 'above', of: 'A' }],
      idx,
      15,
    );
    expect(out![0]).toEqual({ kind: 'translate', x: 0, y: -15 });
  });

  it('offset-translate of=string + offset', () => {
    const idx = makeStack([['A', [0, 0]]]);
    const out = lowerScopeTransforms(
      [{ kind: 'offset-translate', of: 'A', offset: [10, 5] }],
      idx,
    );
    expect(out![0]).toEqual({ kind: 'translate', x: 10, y: 5 });
  });

  it('offset-translate of=string 缺 offset', () => {
    const idx = makeStack([['A', [100, 100]]]);
    const out = lowerScopeTransforms(
      [{ kind: 'offset-translate', of: 'A' }],
      idx,
    );
    expect(out![0]).toEqual({ kind: 'translate', x: 100, y: 100 });
  });
});

describe('lowerScopeTransforms 失败情形', () => {
  it('at-translate of 未解析返回 null', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'at-translate', direction: 'right', of: 'B' }],
      new NameStack(),
      10,
    );
    expect(out).toBeNull();
  });

  it('offset-translate of=string 未解析返回 null', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'offset-translate', of: 'B', offset: [5, 0] }],
      new NameStack(),
    );
    expect(out).toBeNull();
  });

  it('polar-translate origin=string 未解析返回 null', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'polar-translate', origin: 'B', angle: 0, radius: 10 }],
      new NameStack(),
    );
    expect(out).toBeNull();
  });

  it('链中混合：合法 translate + 失败 at-translate → 整体 null', () => {
    const out = lowerScopeTransforms(
      [
        { kind: 'translate', x: 5, y: 0 },
        { kind: 'at-translate', direction: 'right', of: 'missing' },
      ],
      new NameStack(),
      10,
    );
    expect(out).toBeNull();
  });
});

describe('lowerScopeTransforms rotate / scale 透传', () => {
  it('rotate 含 cx/cy', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'rotate', degrees: 45, cx: 1, cy: 2 }],
      new NameStack(),
    );
    expect(out![0]).toEqual({ kind: 'rotate', degrees: 45, cx: 1, cy: 2 });
  });

  it('rotate 缺 cx/cy 不带它们', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'rotate', degrees: 30 }],
      new NameStack(),
    );
    expect(out![0]).toEqual({ kind: 'rotate', degrees: 30 });
  });

  it('scale 含 y', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'scale', x: 2, y: 3 }],
      new NameStack(),
    );
    expect(out![0]).toEqual({ kind: 'scale', x: 2, y: 3 });
  });

  it('scale 缺 y 不带它', () => {
    const out = lowerScopeTransforms(
      [{ kind: 'scale', x: 2 }],
      new NameStack(),
    );
    expect(out![0]).toEqual({ kind: 'scale', x: 2 });
  });

  it('projectLayoutToGlobal 在负 scale 下保持 rect 尺寸为正数', () => {
    const layout = projectLayoutToGlobal(
      layoutForProjection(),
      [{ kind: 'scale', x: -2, y: 3 }],
    );
    expect(layout.rect.x).toBeCloseTo(-20, 6);
    expect(layout.rect.y).toBeCloseTo(60, 6);
    expect(layout.rect.width).toBe(60);
    expect(layout.rect.height).toBe(120);
    expect(layout.margin).toBe(6);
  });

  it('projectLayoutToGlobal 应同步 rect.rotate 与 rotateDeg', () => {
    const layout = projectLayoutToGlobal(
      layoutForProjection(),
      [{ kind: 'rotate', degrees: 45 }],
    );
    expect(layout.rect.rotate).toBeCloseTo(Math.PI / 4, 6);
    expect(layout.rotateDeg).toBeCloseTo(45, 6);
  });
});

describe('lowerScopeTransforms 链复合', () => {
  it('混合 4 种 translate 变体 + rotate + scale 全部成功 lower', () => {
    const idx = makeStack([
      ['A', [10, 0]],
      ['B', [0, 0]],
    ]);
    const transforms: Array<IRTransform> = [
      { kind: 'translate', x: 5, y: 5 },
      { kind: 'polar-translate', angle: 0, radius: 10 },
      { kind: 'at-translate', direction: 'right', of: 'A', distance: 4 },
      { kind: 'offset-translate', of: 'B', offset: [1, 2] },
      { kind: 'rotate', degrees: 30 },
      { kind: 'scale', x: 2 },
    ];
    const out = lowerScopeTransforms(transforms, idx);
    expect(out).not.toBeNull();
    expect(out!).toHaveLength(6);
    expect(out![0]).toEqual({ kind: 'translate', x: 5, y: 5 });
    expect((out![1] as { x: number; y: number }).x).toBeCloseTo(10, 6);
    expect(out![2]).toEqual({ kind: 'translate', x: 14, y: 0 });
    expect(out![3]).toEqual({ kind: 'translate', x: 1, y: 2 });
    expect(out![4]).toEqual({ kind: 'rotate', degrees: 30 });
    expect(out![5]).toEqual({ kind: 'scale', x: 2 });
  });
});
