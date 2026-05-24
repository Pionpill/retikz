/**
 * Node pin 引脚（alpha.7 ADR-03）
 * @description label + 引线：pin:true 时从 node 边界画 leader PathPrim 到 label 框近边。
 *   leader 起点在 node 边界朝 label 方向；样式 leader.stroke/dashPattern；pin 缺省不画。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const findPaths = (prims: Array<ScenePrimitive>): Array<PathPrim> =>
  flattenPrims(prims).filter((p): p is PathPrim => p.type === 'path');

const compileNode = (label: unknown): Array<PathPrim> => {
  const ir: IR = {
    version: 1,
    type: 'scene',
    children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A', label } as never],
  };
  return findPaths(compileToScene(ir).primitives);
};

const lineEnds = (p: PathPrim): { from: [number, number]; to: [number, number] } => {
  const move = p.commands.find(c => c.kind === 'move');
  const line = p.commands.find(c => c.kind === 'line');
  if (move?.kind !== 'move' || line?.kind !== 'line') throw new Error('expected move + line');
  return { from: move.to, to: line.to };
};

describe('pin 引线产出', () => {
  it('pin:true → 恰好 1 条 leader PathPrim（move + line）', () => {
    const paths = compileNode({ text: 'x', position: 'above', pin: true });
    expect(paths).toHaveLength(1);
    expect(paths[0].commands.map(c => c.kind)).toEqual(['move', 'line']);
  });

  it("position:'above' → leader 竖直向上（end 比 start 更高、x 近似相等）", () => {
    const { from, to } = lineEnds(compileNode({ text: 'x', position: 'above', pin: true })[0]);
    expect(to[1]).toBeLessThan(from[1]); // 屏幕 y-down：label 在上 → end y 更小
    expect(Math.abs(to[0] - from[0])).toBeLessThan(1); // 竖直
  });

  it('pin 缺省 / false → 不画 leader', () => {
    expect(compileNode({ text: 'x', position: 'above' })).toHaveLength(0);
    expect(compileNode({ text: 'x', position: 'above', pin: false })).toHaveLength(0);
  });
});

describe('pin 引线样式', () => {
  it('leader.stroke / dashPattern 生效', () => {
    const paths = compileNode({
      text: 'x',
      position: 'right',
      pin: true,
      leader: { stroke: 'gray', dashPattern: [2, 2] },
    });
    expect(paths[0].stroke).toBe('gray');
    expect(paths[0].dashPattern).toEqual([2, 2]);
  });

  it('leader.stroke 缺省继承 currentColor', () => {
    const paths = compileNode({ text: 'x', position: 'above', pin: true });
    expect(paths[0].stroke).toBe('currentColor');
  });
});

describe('多 pin', () => {
  it('label 数组多 pin → 各产独立 leader', () => {
    const paths = compileNode([
      { text: 'in', position: 'left', pin: true },
      { text: 'out', position: 'right', pin: true },
    ]);
    expect(paths).toHaveLength(2);
  });
});
