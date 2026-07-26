import { describe, expect, it } from 'vitest';

import type { CompileWarning, IRScene } from '../../src';
import type { CubicPathCommand, PathPrim, ScenePrimitive, TextPrim } from '../../src/contract';

import { compileToScene } from '../../src/compile/compile';
import { PathSchema, SmoothStepSchema } from '../../src/schemas';
import { move } from '../helpers/path-command-factory';

const silent = { onWarn: () => {} };

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });
const path = (...steps: Array<unknown>): IRScene => scene([{ type: 'path', children: steps as never }]);

/** 命令是否为有限坐标的 cubic */
const isFiniteCubic = (cmd: CubicPathCommand): boolean =>
  [cmd.control1, cmd.control2, cmd.to].every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));

describe('smooth step：happy path', () => {
  it('cursor + 2 points（3 knot）→ move + 2 cubic，每段 .to 命中对应 knot', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
    );
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    expect(commands[0]).toEqual(move([0, 0]));
    const cubics = commands.filter((c): c is CubicPathCommand => c.kind === 'cubic');
    expect(cubics).toHaveLength(2);
    expect(cubics[0].to).toEqual([10, 0]);
    expect(cubics[1].to).toEqual([10, 10]);
    for (const c of cubics) expect(isFiniteCubic(c)).toBe(true);
  });

  it('cursor + 4 points（5 knot）→ 4 cubic，全部过点', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
          [20, 10],
          [20, 0],
        ],
      },
    );
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    const cubics = commands.filter((c): c is CubicPathCommand => c.kind === 'cubic');
    expect(cubics).toHaveLength(4);
    expect(cubics.map(c => c.to)).toEqual([
      [10, 0],
      [10, 10],
      [20, 10],
      [20, 0],
    ]);
  });

  it('tension 显式 vs 默认：控制点不同、.to 相同', () => {
    const base = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
    );
    const loose = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
        tension: 2,
      },
    );
    const baseCubics = findPathPrim(compileToScene(base, silent).scene.primitives).commands.filter(
      (c): c is CubicPathCommand => c.kind === 'cubic',
    );
    const looseCubics = findPathPrim(compileToScene(loose, silent).scene.primitives).commands.filter(
      (c): c is CubicPathCommand => c.kind === 'cubic',
    );
    // .to 与 tension 无关
    expect(looseCubics.map(c => c.to)).toEqual(baseCubics.map(c => c.to));
    // 控制点应不同
    expect(looseCubics.map(c => [c.control1, c.control2])).not.toEqual(baseCubics.map(c => [c.control1, c.control2]));
  });
});

describe('smooth step：边界', () => {
  it('cursor + 1 point（2 knot）→ 1 cubic，.to = 该点', () => {
    const ir = path({ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'smooth', points: [[4, 3]] });
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    const cubics = commands.filter((c): c is CubicPathCommand => c.kind === 'cubic');
    expect(cubics).toHaveLength(1);
    expect(cubics[0].to).toEqual([4, 3]);
  });

  it('tension 省略 ≡ tension:1（两次编译逐字一致）', () => {
    const omitted = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
    );
    const explicit = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
        tension: 1,
      },
    );
    expect(findPathPrim(compileToScene(explicit, silent).scene.primitives).commands).toEqual(
      findPathPrim(compileToScene(omitted, silent).scene.primitives).commands,
    );
  });
});

describe('smooth step：错误路径', () => {
  it('points: [] → schema 拒绝（违反 min(1)）', () => {
    expect(SmoothStepSchema.safeParse({ type: 'step', kind: 'smooth', points: [] }).success).toBe(false);
  });

  it('tension <= 0 → schema 拒绝', () => {
    expect(
      SmoothStepSchema.safeParse({
        type: 'step',
        kind: 'smooth',
        points: [[10, 0]],
        tension: 0,
      }).success,
    ).toBe(false);
    expect(
      SmoothStepSchema.safeParse({
        type: 'step',
        kind: 'smooth',
        points: [[10, 0]],
        tension: -1,
      }).success,
    ).toBe(false);
  });

  it('tension 非有限（Infinity / NaN）→ schema 拒绝', () => {
    expect(
      SmoothStepSchema.safeParse({
        type: 'step',
        kind: 'smooth',
        points: [[10, 0]],
        tension: Infinity,
      }).success,
    ).toBe(false);
    expect(
      SmoothStepSchema.safeParse({
        type: 'step',
        kind: 'smooth',
        points: [[10, 0]],
        tension: NaN,
      }).success,
    ).toBe(false);
  });

  it('points 含非法 Target → schema 拒绝', () => {
    expect(
      SmoothStepSchema.safeParse({
        type: 'step',
        kind: 'smooth',
        points: [{ nonsense: true }],
      }).success,
    ).toBe(false);
  });

  it('smooth 作 path 首 step（无前置 cursor）→ 不产 path（跳过 + 警告）', () => {
    // 无前置 move/cursor：findPrev() 为 null，整 path 应被跳过并发 PATH_TOO_SHORT（与 line 作首段一致）
    const warnings: Array<CompileWarning> = [];
    const ir = path(
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
      { type: 'step', kind: 'line', to: [20, 20] },
    );
    const result = compileToScene(ir, { onWarn: w => warnings.push(w) }).scene;
    expect(result.primitives.find(p => p.type === 'path')).toBeUndefined();
    expect(warnings.find(w => w.code === 'PATH_TOO_SHORT')).toBeDefined();
  });
});

describe('smooth step：交互', () => {
  it('smooth + label → 产出 label primitive（TextPrim）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
        label: { text: 'flow' },
      },
    );
    const prims = compileToScene(ir, silent).scene.primitives;
    const labels = prims.filter((p): p is TextPrim => p.type === 'text');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(l => l.lines.some(line => line.text === 'flow'))).toBe(true);
  });

  it('smooth 后接 line：cursor = points 末项，line 从此续接', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
      { type: 'step', kind: 'line', to: [20, 20] },
    );
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    // 末 cubic .to = smooth 末点；其后无 move（line 复用 cursor），末命令为 line→(20,20)
    const lastCubicIdx = commands.map(c => c.kind).lastIndexOf('cubic');
    expect(commands[lastCubicIdx].kind).toBe('cubic');
    expect((commands[lastCubicIdx] as CubicPathCommand).to).toEqual([10, 10]);
    expect(commands[commands.length - 1]).toEqual({ kind: 'line', to: [20, 20] });
  });

  it('smooth 后接 cycle：闭合回最近 move 起点', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
      { type: 'step', kind: 'cycle' },
    );
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    // cycle 收尾：末命令为 close 或一条回到 (0,0) 的 line
    const last = commands[commands.length - 1];
    expect(last.kind === 'close' || (last.kind === 'line' && last.to[0] === 0 && last.to[1] === 0)).toBe(true);
  });

  it('smooth + path-level marks → 多产 primitive（mark 沿曲线）', () => {
    const without = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          [10, 0],
          [10, 10],
        ],
      },
    );
    const withMark: IRScene = scene([
      {
        type: 'path',
        marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }],
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'smooth',
            points: [
              [10, 0],
              [10, 10],
            ],
          },
        ],
      } as never,
    ]);
    const baseCount = compileToScene(without, silent).scene.primitives.length;
    const markCount = compileToScene(withMark, silent).scene.primitives.length;
    expect(markCount).toBeGreaterThan(baseCount);
  });

  it('smooth → line 到 Node：line 朝 smooth 末点方向裁剪目标边界（非 smooth 前位置）', () => {
    // 回归：smooth 不属 hasTo，prev.anchor 仍指 smooth 前的 move；line 终点须朝 smooth 末点 [100,0] 裁剪
    // T 右边界（x>0），而非朝 move 起点 [-100,0] 裁到左边界（x<0）。
    const ir: IRScene = scene([
      { type: 'node', id: 'T', position: [0, 0], minimumSize: 20 },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [-100, 0] },
          { type: 'step', kind: 'smooth', points: [[100, 0]] },
          { type: 'step', kind: 'line', to: { id: 'T' } },
        ],
      } as never,
    ]);
    const commands = findPathPrim(compileToScene(ir, silent).scene.primitives).commands;
    const last = commands[commands.length - 1];
    expect(last.kind).toBe('line');
    if (last.kind === 'line') expect(last.to[0]).toBeGreaterThan(0);
  });
});

describe('smooth step：JSON round-trip', () => {
  it('含 smooth step 的 IRPath → parse(JSON.parse(stringify)) 与原 parse 深等', () => {
    const ir = {
      type: 'path' as const,
      stroke: 'steelblue',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'smooth',
          points: [
            [10, 0],
            [10, 10],
            [20, 5],
          ],
          tension: 1.2,
          label: { text: 'flow' },
        },
      ],
    };
    const parsed = PathSchema.parse(ir);
    const roundTripped = PathSchema.parse(JSON.parse(JSON.stringify(ir)));
    expect(roundTripped).toEqual(parsed);
  });
});
