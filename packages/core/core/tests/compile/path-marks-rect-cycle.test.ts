import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { rectPerimeterSample } from '../../src/geometry/segment';
import type { IR, ScenePrimitive } from '../../src';

/**
 * C7：rectangle / cycle 段也注册段采样器，中段 marks 的 pos∈[0,1] 因此把它们计入段数，
 * 且 mark 能落在矩形周长 / cycle 闭合段上。
 */

/** mark marker group 的签名：transforms = [translate(point), rotate, scale, translate]；取首个 translate 为落点 */
const findMarkPoint = (prims: ReadonlyArray<ScenePrimitive>): [number, number] | undefined => {
  for (const p of prims) {
    if (p.type !== 'group') continue;
    const t = p.transforms;
    if (
      t &&
      t.length === 4 &&
      t[0].kind === 'translate' &&
      t[1].kind === 'rotate' &&
      t[2].kind === 'scale'
    ) {
      return [t[0].x, t[0].y];
    }
    const inner = findMarkPoint(p.children);
    if (inner) return inner;
  }
  return undefined;
};

describe('rectPerimeterSample（矩形周长采样，CW from 左上）', () => {
  const from: [number, number] = [0, 0];
  const to: [number, number] = [40, 20];
  it('四角：t=0/0.25/0.5/0.75 → 左上 / 右上 / 右下 / 左下', () => {
    expect(rectPerimeterSample(from, to, 0).point).toEqual([0, 0]);
    expect(rectPerimeterSample(from, to, 0.25).point).toEqual([40, 0]);
    expect(rectPerimeterSample(from, to, 0.5).point).toEqual([40, 20]);
    expect(rectPerimeterSample(from, to, 0.75).point).toEqual([0, 20]);
  });
  it('上边切线沿 +x，右边切线沿 +y（顺时针 y-down）', () => {
    expect(rectPerimeterSample(from, to, 0.1).tangent).toEqual([1, 0]);
    expect(rectPerimeterSample(from, to, 0.35).tangent).toEqual([0, 1]);
  });
  it('对角任意顺序归一化（to/from 互换结果相同）', () => {
    expect(rectPerimeterSample([40, 20], [0, 0], 0.5).point).toEqual([40, 20]);
  });
});

describe('C7：cycle 闭合段可承载 mark', () => {
  it('三角形闭合路径，pos=5/6 落在闭合段中点 (2.5, 4)', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: [{ pos: 5 / 6, mark: { kind: 'arrow', shape: 'stealth' } }],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [5, 8] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    // 3 个采样段（line, line, cycle）；pos=5/6 → segIdx=2(cycle) localT=0.5
    // → 闭合段 (5,8)→(0,0) 中点 (2.5, 4)
    const pt = findMarkPoint(compileToScene(ir).primitives);
    expect(pt).toBeDefined();
    expect(pt![0]).toBeCloseTo(2.5, 5);
    expect(pt![1]).toBeCloseTo(4, 5);
  });
});

describe('C7：rectangle 段计入段数并可承载 mark', () => {
  const rectPath = (pos: number): IR => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        marks: [{ pos, mark: { kind: 'arrow', shape: 'stealth' } }],
        children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [40, 20] }],
      },
    ],
  });

  it('pos=0.5 → 矩形周长右下角 (40, 20)', () => {
    const pt = findMarkPoint(compileToScene(rectPath(0.5)).primitives);
    expect(pt).toBeDefined();
    expect(pt![0]).toBeCloseTo(40, 5);
    expect(pt![1]).toBeCloseTo(20, 5);
  });

  it('pos=0.25 → 矩形周长右上角 (40, 0)', () => {
    const pt = findMarkPoint(compileToScene(rectPath(0.25)).primitives);
    expect(pt).toBeDefined();
    expect(pt![0]).toBeCloseTo(40, 5);
    expect(pt![1]).toBeCloseTo(0, 5);
  });
});
