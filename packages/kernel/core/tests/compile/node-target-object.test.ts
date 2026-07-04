import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../src/contract';
import type { IRScene, IRTarget } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((x): x is PathPrim => x.type === 'path');

const lastLineEnd = (prim: PathPrim): [number, number] => {
  for (let i = prim.commands.length - 1; i >= 0; i--) {
    const cmd = prim.commands[i];
    if (cmd.kind === 'line') return [cmd.to[0], cmd.to[1]];
  }
  throw new Error('no line cmd found');
};

/** 编一条从 (100,100) line 到 target 的 path，返回末端 line 终点 */
const endOf = (target: IRTarget): [number, number] => {
  const ir: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      { type: 'node', id: 'A', position: [0, 0], text: 'Hello', shape: 'rectangle' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [100, 100] },
          { type: 'step', kind: 'line', to: target },
        ],
      },
    ],
  };
  const scene = compileToScene(ir);
  const prim = findPathPrim(scene.primitives);
  if (!prim) throw new Error('expected PathPrim');
  return lastLineEnd(prim);
};

describe('对象 NodeTarget 命名 / 角度 / auto 方向正确', () => {
  it('命名 anchor：top 在 bottom 上方、right 在 left 右侧', () => {
    const top = endOf({ id: 'A', anchor: 'top' });
    const bottom = endOf({ id: 'A', anchor: 'bottom' });
    const right = endOf({ id: 'A', anchor: 'right' });
    const left = endOf({ id: 'A', anchor: 'left' });
    expect(top[1]).toBeLessThan(bottom[1]); // y 向下：top 更小
    expect(right[0]).toBeGreaterThan(left[0]);
  });

  it('角度 anchor：0° 落 right 侧、90° 落 bottom 侧（边界点）', () => {
    const a0 = endOf({ id: 'A', anchor: 0 });
    const a90 = endOf({ id: 'A', anchor: 90 });
    const center = endOf({ id: 'A', anchor: 'center' });
    expect(a0[0]).toBeGreaterThan(center[0]); // 0° 朝 +x
    expect(a90[1]).toBeGreaterThan(center[1]); // 90° 朝 +y（下）
  });

  it('auto clip：{ id:"A" } 落在中心与 toward([100,100]) 之间的边界上（不等于中心）', () => {
    const auto = endOf({ id: 'A' });
    const center = endOf({ id: 'A', anchor: 'center' });
    // auto 朝 [100,100] 贴边界 → 在中心的右下方向
    expect(auto[0]).toBeGreaterThan(center[0]);
    expect(auto[1]).toBeGreaterThan(center[1]);
  });
});

describe('{ side, fraction } 边上比例点', () => {
  it('top t=0.5 == 命名 top anchor（edgePoint 中点 = cardinal）', () => {
    expect(endOf({ id: 'A', anchor: { side: 'top', fraction: 0.5 } })).toEqual(endOf({ id: 'A', anchor: 'top' }));
  });

  it('left t=0 == top-left 角（rect 边端点 = 角 anchor）', () => {
    expect(endOf({ id: 'A', anchor: { side: 'left', fraction: 0 } })).toEqual(endOf({ id: 'A', anchor: 'top-left' }));
  });
});

describe('offset 世界系叠加', () => {
  it('{ anchor:"top", offset:[5,-3] } == top 点 + [5,-3]', () => {
    const [nx, ny] = endOf({ id: 'A', anchor: 'top' });
    const [ox, oy] = endOf({ id: 'A', anchor: 'top', offset: [5, -3] });
    expect(ox).toBeCloseTo(nx + 5, 6);
    expect(oy).toBeCloseTo(ny - 3, 6);
  });

  it('无 anchor + offset：中心/边界点 + offset', () => {
    const [bx, by] = endOf({ id: 'A' });
    const [ox, oy] = endOf({ id: 'A', offset: [10, 0] });
    expect(ox).toBeCloseTo(bx + 10, 6);
    expect(oy).toBeCloseTo(by, 6);
  });
});

describe('错误路径', () => {
  it('未定义 id → 不产 PathPrim', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'nonexistent' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(scene.primitives.find(p => p.type === 'path')).toBeUndefined();
  });
});

describe('Coordinate（零尺寸）anchor 退化（ADR-01 决策细节 #10）', () => {
  /** 编一条 line 到 target、终点（场景含 id='c' 的零尺寸 Coordinate 在 (50,50)） */
  const coordEnd = (target: IRTarget): [number, number] => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'c', position: [50, 50] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: target },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const prim = findPathPrim(scene.primitives);
    if (!prim) throw new Error('expected PathPrim');
    return lastLineEnd(prim);
  };

  it('命名 anchor 退化为中心（零尺寸 → 9 anchor 都 = Coordinate 点）', () => {
    expect(coordEnd({ id: 'c', anchor: 'top' })).toEqual([50, 50]);
    expect(coordEnd({ id: 'c', anchor: 'bottom-left' })).toEqual([50, 50]);
  });

  it('角度 anchor 退化为中心', () => {
    expect(coordEnd({ id: 'c', anchor: 30 })).toEqual([50, 50]);
  });

  it('{ side, fraction } 对零尺寸 Coordinate 报明确错', () => {
    expect(() => coordEnd({ id: 'c', anchor: { side: 'top', fraction: 0.5 } })).toThrow(/zero-size Coordinate/);
  });
});
