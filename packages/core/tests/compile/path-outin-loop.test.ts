/**
 * compile：bend out/in 角 + self-loop 行为测试
 * @description 断言实现完成后的语义：out/in 角 → cubic 控制点沿指定方向；looseness 调控制点距离；
 *   from==to 退化为自环（非退化直线）；out/in 与 bendDirection 同给时 out/in 优先。
 *   编译实现尚未消费这些新字段，故本组用例当前应失败（待实现 Agent 落地编译）。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { CubicPathCommand, PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: ReadonlyArray<ScenePrimitive>): PathPrim => {
  for (const p of prims) {
    if (p.type === 'path') return p;
    if (p.type === 'group') {
      try {
        return findPathPrim(p.children);
      } catch {
        // 继续找下一个
      }
    }
  }
  throw new Error('expected a PathPrim in scene');
};

/** 首个 cubic 命令 */
const firstCubic = (path: PathPrim): CubicPathCommand => {
  const c = path.commands.find((x): x is CubicPathCommand => x.kind === 'cubic');
  if (!c) throw new Error('expected a cubic command');
  return c;
};

/** 段起点（首个 move 的 to） */
const firstMove = (path: PathPrim): [number, number] => {
  const m = path.commands.find(x => x.kind === 'move');
  if (!m || m.kind !== 'move') throw new Error('expected a move command');
  return m.to;
};

/** 向量方向角（度，0°=+x，90°=+y screen-down，与 IR 角度约定一致） */
const angleDeg = (dx: number, dy: number): number =>
  (Math.atan2(dy, dx) * 180) / Math.PI;

/** 角度归一到 (-180, 180] 的差值绝对值 */
const angleDiff = (a: number, b: number): number => {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  return Math.abs(d);
};

describe('out/in 角编译为 cubic 控制点方向', () => {
  it('outAngle/inAngle → control1 沿 outAngle、control2 沿 inAngle', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'bend',
              to: [10, 0],
              bendDirection: 'left',
              outAngle: 45,
              inAngle: 135,
            },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    const from = firstMove(path);
    const cubic = firstCubic(path);
    const to = cubic.to;
    // control1 从 from 出发的方向 ≈ outAngle
    const outDir = angleDeg(cubic.control1[0] - from[0], cubic.control1[1] - from[1]);
    expect(angleDiff(outDir, 45)).toBeLessThan(1);
    // control2 从 to 出发（回看入射）的方向 ≈ inAngle
    const inDir = angleDeg(cubic.control2[0] - to[0], cubic.control2[1] - to[1]);
    expect(angleDiff(inDir, 135)).toBeLessThan(1);
  });
});

describe('out/in 与 bendDirection 同给 → out/in 优先', () => {
  it('out/in 在场时控制点由 out/in 决定，忽略 bendDirection 对称弯', () => {
    const withOutIn: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'bend',
              to: [10, 0],
              bendDirection: 'right',
              bendAngle: 60,
              outAngle: 60,
              inAngle: 120,
            },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(withOutIn).primitives);
    const from = firstMove(path);
    const cubic = firstCubic(path);
    const outDir = angleDeg(cubic.control1[0] - from[0], cubic.control1[1] - from[1]);
    // out/in 优先：control1 方向跟随 outAngle=60，而非 bend right 的对称弯
    expect(angleDiff(outDir, 60)).toBeLessThan(1);
  });
});

describe('looseness 调控制点距离', () => {
  it('looseness 越大控制点离端点越远', () => {
    const mk = (looseness: number): IR => ({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'bend',
              to: [10, 0],
              bendDirection: 'left',
              outAngle: 45,
              inAngle: 135,
              looseness,
            },
          ],
        },
      ],
    });
    const tight = firstCubic(findPathPrim(compileToScene(mk(0.5)).primitives));
    const loose = firstCubic(findPathPrim(compileToScene(mk(2)).primitives));
    const from = [0, 0];
    const distTight = Math.hypot(tight.control1[0] - from[0], tight.control1[1] - from[1]);
    const distLoose = Math.hypot(loose.control1[0] - from[0], loose.control1[1] - from[1]);
    expect(distLoose).toBeGreaterThan(distTight);
  });
});

describe('self-loop（from==to）成环（非退化直线）', () => {
  it('同坐标 bend + out/in → cubic 控制点偏离端点（环张开）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [5, 5] },
            {
              type: 'step',
              kind: 'bend',
              to: [5, 5],
              bendDirection: 'left',
              outAngle: 60,
              inAngle: 120,
            },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    const cubic = firstCubic(path);
    // 退化判定：两控制点都贴住端点 (5,5) 则是退化直线/点。自环要求至少一个控制点显著偏离
    const off1 = Math.hypot(cubic.control1[0] - 5, cubic.control1[1] - 5);
    const off2 = Math.hypot(cubic.control2[0] - 5, cubic.control2[1] - 5);
    expect(Math.max(off1, off2)).toBeGreaterThan(0.5);
  });

  it('同 node id 自环（from==to 同节点）→ 成环', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            {
              type: 'step',
              kind: 'bend',
              to: { id: 'A' },
              bendDirection: 'left',
              outAngle: 60,
              inAngle: 120,
            },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    const cubic = firstCubic(path);
    // 控制点张角：自环时两控制点不应重合
    const span = Math.hypot(
      cubic.control1[0] - cubic.control2[0],
      cubic.control1[1] - cubic.control2[1],
    );
    expect(span).toBeGreaterThan(0.5);
  });
});
