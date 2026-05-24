/**
 * compile：path 整体 rotate / scale 变换行为测试
 * @description 断言实现完成后的语义：path rotate/scale 把 path 几何包进 GroupPrim 并写 transforms，
 *   旋转支点 = path 包围盒中心；与包一个绕同一中心旋转的 Scope 等价；非等比 scale；
 *   旋转 path + 箭头时箭头方向随变换正确（变换顺序硬契约：端点先 resolve、shrink 在原始几何、最后包 group）。
 *   编译实现尚未消费 path rotate/scale，故本组用例当前应失败（待实现 Agent 落地编译）。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { GroupPrim, IR, PathPrim, RotateTransform, ScaleTransform, ScenePrimitive } from '../../src';

/** 找顶层第一个带 transforms 的 GroupPrim */
const findTransformGroup = (
  prims: ReadonlyArray<ScenePrimitive>,
): GroupPrim | undefined => {
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
const linePath = (extra: Record<string, unknown>): IR => ({
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
    const compiled = compileToScene(linePath({ rotate: 30 }));
    const group = findTransformGroup(compiled.primitives);
    expect(group).toBeDefined();
    const rot = group?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    expect(rot).toBeDefined();
    expect(rot?.degrees).toBe(30);
    expect(rot?.cx).toBeCloseTo(5, 6);
    expect(rot?.cy).toBeCloseTo(0, 6);
  });

  it('包裹内仍含原始 path 几何（commands 不被旋转污染，几何留原坐标）', () => {
    const compiled = compileToScene(linePath({ rotate: 30 }));
    const path = findPathPrim(compiled.primitives);
    expect(path).toBeDefined();
    // 端点几何在 group 内保持原坐标，旋转由外层 group.transforms 施加
    const move = path?.commands.find(c => c.kind === 'move');
    expect(move?.to).toEqual([0, 0]);
  });
});

describe('path rotate 与绕同一中心的 scope rotate 等价', () => {
  it('<Path rotate=30> ≡ 包一个 rotate(30, cx=5, cy=0) 的 Scope', () => {
    const viaPath = compileToScene(linePath({ rotate: 30 }));
    const viaScope = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 30, cx: 5, cy: 0 }],
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
    });
    const gPath = findTransformGroup(viaPath.primitives);
    const gScope = findTransformGroup(viaScope.primitives);
    // 两者的旋转 transform 等价
    const rPath = gPath?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    const rScope = gScope?.transforms?.find((t): t is RotateTransform => t.kind === 'rotate');
    expect(rPath?.degrees).toBe(rScope?.degrees);
    expect(rPath?.cx).toBeCloseTo(rScope?.cx ?? NaN, 6);
    expect(rPath?.cy).toBeCloseTo(rScope?.cy ?? NaN, 6);
    // 两种写法 Scene 结构不同——<Path rotate> 把未变换几何包进 rotate group；scope 内坐标字面量 path
    // 走 hoist + 端点预变换（既有契约）。二者渲染等价，等价性体现在同一 rotate transform（degrees + 支点
    // cx/cy）上，故此处只比 transform，不比两种编码各自的内层 commands。
  });
});

describe('path scale（等比 / 非等比）', () => {
  it('等比 scale=2 → scale transform x=2 y=2(或省略)', () => {
    const compiled = compileToScene(linePath({ scale: 2 }));
    const group = findTransformGroup(compiled.primitives);
    const sc = group?.transforms?.find((t): t is ScaleTransform => t.kind === 'scale');
    expect(sc).toBeDefined();
    expect(sc?.x).toBe(2);
    expect(sc?.y ?? sc?.x).toBe(2);
  });

  it('非等比 scale {x:2,y:0.5} → scale transform x=2 y=0.5', () => {
    const compiled = compileToScene(linePath({ scale: { x: 2, y: 0.5 } }));
    const group = findTransformGroup(compiled.primitives);
    const sc = group?.transforms?.find((t): t is ScaleTransform => t.kind === 'scale');
    expect(sc).toBeDefined();
    expect(sc?.x).toBe(2);
    expect(sc?.y).toBe(0.5);
  });
});

describe('旋转 path + 箭头：方向随变换正确（变换顺序硬契约）', () => {
  it('rotate + arrow="->"：箭头几何在原始几何上解析（shrink 未被 path transform 污染）后整体由 group 旋转', () => {
    const noRotate = compileToScene(linePath({ arrow: '->' }));
    const rotated = compileToScene(linePath({ arrow: '->', rotate: 90 }));
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
