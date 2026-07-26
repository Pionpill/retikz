import { describe, expect, it } from 'vitest';

import type { GroupPrim, IRScene, PathPrim, RotateTransform, ScaleTransform, ScenePrimitive } from '../../src';

import { compileToScene } from '../../src/compile/compile';
import { arrowMarks } from '../helpers/arrow-marks';

/** 找顶层第一个带 transforms 的 GroupPrim */
const findTransformGroup = (prims: ReadonlyArray<ScenePrimitive>): GroupPrim | undefined => {
  for (const p of prims) {
    if (p.type === 'group' && p.transforms && p.transforms.length > 0) return p;
  }
  return undefined;
};

/** 递归找首个 PathPrim */
const findPathPrim = (prims: ReadonlyArray<ScenePrimitive>): PathPrim | undefined => {
  for (const p of prims) {
    if (p.type === 'path') return p;
    if (p.type === 'group') {
      const inner = findPathPrim(p.children);
      if (inner) return inner;
    }
  }
  return undefined;
};

/** 两段直线 path 的最小 IR（bbox center = [5, 0]） */
const linePath = (extra: Record<string, unknown>): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      ...extra,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    },
  ],
});

describe('path rotate → GroupPrim 包裹 + 支点为包围盒中心', () => {
  it('rotate=30 产 rotate transform，cx/cy = path bbox center [5,0]', () => {
    const compiled = compileToScene(linePath({ rotate: 30 })).scene;
    const group = findTransformGroup(compiled.primitives);
    expect(group).toBeDefined();
    const rot = group?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    expect(rot).toBeDefined();
    expect(rot?.degrees).toBe(30);
    expect(rot?.cx).toBeCloseTo(5, 6);
    expect(rot?.cy).toBeCloseTo(0, 6);
  });

  it('包裹内仍含原始 path 几何（commands 不被旋转污染，几何留原坐标）', () => {
    const compiled = compileToScene(linePath({ rotate: 30 })).scene;
    const path = findPathPrim(compiled.primitives);
    expect(path).toBeDefined();
    // 端点几何在 group 内保持原坐标，旋转由外层 group.transforms 施加
    const move = path?.commands.find(c => c.kind === 'move');
    expect(move?.to).toEqual([0, 0]);
  });
});

describe('path rotate 与绕同一中心的 scope rotate 等价', () => {
  it('<Path rotate=30> ≡ 包一个 rotate(30, cx=5, cy=0) 的 Scope', () => {
    const viaPath = compileToScene(linePath({ rotate: 30 })).scene;
    const viaScope = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 30, pivot: [5, 0] }],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        },
      ],
    }).scene;
    const gPath = findTransformGroup(viaPath.primitives);
    const gScope = findTransformGroup(viaScope.primitives);
    // 两者的旋转 transform 等价
    const rPath = gPath?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    const rScope = gScope?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    expect(rPath?.degrees).toBe(rScope?.degrees);
    expect(rPath?.cx).toBeCloseTo(rScope?.cx ?? NaN, 6);
    expect(rPath?.cy).toBeCloseTo(rScope?.cy ?? NaN, 6);
    // 两种写法都保留局部几何，并分别由 Path / Scope 的 group transform 完成旋转
  });
});

describe('path scale（等比 / 非等比）', () => {
  it('等比 scale=2 → scale transform x=2 y=2(或省略)', () => {
    const compiled = compileToScene(linePath({ scale: 2 })).scene;
    const group = findTransformGroup(compiled.primitives);
    const sc = group?.transforms?.find((t): t is ScaleTransform => t.kind === 'scale');
    expect(sc).toBeDefined();
    expect(sc?.x).toBe(2);
    expect(sc?.y ?? sc?.x).toBe(2);
  });

  it('非等比 scale {x:2,y:0.5} → scale transform x=2 y=0.5', () => {
    const compiled = compileToScene(linePath({ scale: { x: 2, y: 0.5 } })).scene;
    const group = findTransformGroup(compiled.primitives);
    const sc = group?.transforms?.find((t): t is ScaleTransform => t.kind === 'scale');
    expect(sc).toBeDefined();
    expect(sc?.x).toBe(2);
    expect(sc?.y).toBe(0.5);
  });

  it('transform projection 产生非有限坐标时抛出，避免 Infinity 进入 Scene', () => {
    expect(() => compileToScene(linePath({ scale: Number.MAX_VALUE })).scene).toThrow(/finite|Infinity|NaN/i);
  });
});

describe('旋转 path + 箭头：方向随变换正确（变换顺序硬契约）', () => {
  it('rotate + arrow="->"：箭头几何在原始几何上解析（shrink 未被 path transform 污染）后整体由 group 旋转', () => {
    const noRotate = compileToScene(linePath({ marks: arrowMarks('->') })).scene;
    const rotated = compileToScene(linePath({ marks: arrowMarks('->'), rotate: 90 })).scene;
    // 旋转后仍有 path + 箭头；箭头 shrink 在未旋转几何上完成，故内层 path 的 arrowEnd 解析结果与未旋转一致
    const pNo = findPathPrim(noRotate.primitives);
    const pRot = findPathPrim(rotated.primitives);
    expect(pNo?.arrowEnd?.shape).toBe('stealth');
    expect(pRot?.arrowEnd?.shape).toBe('stealth');
    // 内层 commands 不受 path transform 影响（变换由外层 group 承担），shrink 落点一致
    expect(pRot?.commands).toEqual(pNo?.commands);
    // 旋转产生外层 group
    expect(findTransformGroup(rotated.primitives)).toBeDefined();
    expect(findTransformGroup(noRotate.primitives)).toBeUndefined();
  });
});
