import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { type IR, TargetSchema } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

/** 路径末段的 line endpoint（最后一条 line 命令的 to） */
const lastLineEnd = (prim: PathPrim): [number, number] => {
  for (let i = prim.commands.length - 1; i >= 0; i--) {
    const cmd = prim.commands[i];
    if (cmd.kind === 'line') return [cmd.to[0], cmd.to[1]];
  }
  throw new Error('no line cmd found');
};

const firstMove = (prim: PathPrim): [number, number] => {
  const cmd = prim.commands.find(c => c.kind === 'move');
  if (!cmd) throw new Error('no move cmd found');
  return [cmd.to[0], cmd.to[1]];
};

describe('OffsetPosition: step.to schema 校验', () => {
  it('合法 OffsetPosition 通过 TargetSchema', () => {
    expect(() =>
      TargetSchema.parse({ of: 'A', offset: [10, 5] }),
    ).not.toThrow();
    expect(() =>
      TargetSchema.parse({ of: [0, 0], offset: [10, 0] }),
    ).not.toThrow();
    expect(() =>
      TargetSchema.parse({
        of: { origin: 'A', angle: 0, radius: 30 },
        offset: [0, 5],
      }),
    ).not.toThrow();
  });

  it('TargetSchema 仍接受既有 5 形态（笛卡尔 / polar / string id / relative / relativeAccumulate）', () => {
    expect(() => TargetSchema.parse([1, 2])).not.toThrow();
    expect(() =>
      TargetSchema.parse({ origin: 'A', angle: 0, radius: 30 }),
    ).not.toThrow();
    expect(() => TargetSchema.parse('A')).not.toThrow();
    expect(() => TargetSchema.parse({ relative: [1, 0] })).not.toThrow();
    expect(() => TargetSchema.parse({ relativeAccumulate: [1, 0] })).not.toThrow();
  });
});

describe('OffsetPosition: step.to compile resolve', () => {
  describe('Happy path', () => {
    it('step_to_offset_of_string：path 终点 = A + (10, 5)', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: 'A' },
              { type: 'step', kind: 'line', to: { of: 'A', offset: [50, 0] } },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      const pathPrim = findPathPrim(scene.primitives);
      // 末端无 node 引用 → 直接落 (50, 0)
      const [ex, ey] = lastLineEnd(pathPrim);
      expect(ex).toBeCloseTo(50);
      expect(ey).toBeCloseTo(0);
    });

    it('step_to_offset_of_cartesian：path 终点 = (60, 50)', () => {
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
                kind: 'line',
                to: { of: [50, 50], offset: [10, 0] },
              },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      const pathPrim = findPathPrim(scene.primitives);
      const [mx, my] = firstMove(pathPrim);
      expect(mx).toBeCloseTo(0);
      expect(my).toBeCloseTo(0);
      const [ex, ey] = lastLineEnd(pathPrim);
      expect(ex).toBeCloseTo(60);
      expect(ey).toBeCloseTo(50);
    });

    it('step_to_offset_of_polar：path 终点 = polar 解析后 + offset', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [10, 10] },
              {
                type: 'step',
                kind: 'line',
                to: {
                  of: { origin: 'A', angle: 0, radius: 30 },
                  offset: [0, 5],
                },
              },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      const pathPrim = findPathPrim(scene.primitives);
      // polar(A=(0,0), 0, 30) = (30, 0); + (0, 5) = (30, 5)
      const [ex, ey] = lastLineEnd(pathPrim);
      expect(ex).toBeCloseTo(30);
      expect(ey).toBeCloseTo(5);
    });
  });

  describe('交互', () => {
    it('step_to_offset_chains_with_relative：IRTarget 五种形态混用全部 resolve', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'path',
            children: [
              // move 到 offset of A => (0+0, 0+0) = (0,0)
              {
                type: 'step',
                kind: 'move',
                to: { of: 'A', offset: [0, 0] },
              },
              // line 到 relative [10, 0] => (10, 0)
              { type: 'step', kind: 'line', to: { relative: [10, 0] } },
              // line 到 offset of polar(A,90,20) = (0,20); + [-5, 0] = (-5, 20)
              {
                type: 'step',
                kind: 'line',
                to: {
                  of: { origin: 'A', angle: 90, radius: 20 },
                  offset: [-5, 0],
                },
              },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      const pathPrim = findPathPrim(scene.primitives);
      const [ex, ey] = lastLineEnd(pathPrim);
      expect(ex).toBeCloseTo(-5);
      expect(ey).toBeCloseTo(20);
    });
  });

  describe('错误路径', () => {
    it('step.to=offset of 未定义 id → 整 path 不产出 PathPrim', () => {
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
                kind: 'line',
                to: { of: 'nonexistent', offset: [10, 0] },
              },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      // 未定义 id 让 resolvePosition 返回 null，emitPathPrimitive 返回 null
      const pathPrim = scene.primitives.find(p => p.type === 'path');
      expect(pathPrim).toBeUndefined();
    });
  });
});
