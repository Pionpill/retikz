import { describe, expect, it } from 'vitest';

import type { IR } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { ellipseArc, line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'circlePath'", () => {
  it('circlePath 在原点 r=10 → 两段半弧', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
          ],
        },
      ],
    };
    // circlePath 产 ellipseArc full sweep (0→360)；adapter 自行拆 SVG 两段
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
    ]);
  });

  it('circle 之后接 line：line 起点是圆心（不是圆周）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
            { type: 'step', kind: 'line', to: [50, 50] },
          ],
        },
      ],
    };
    // 圆画完 lastEnd 回到 center (0,0) → line 从 (0,0) → (50,50)
    // 由于 (0,0) 不等于 ellipseArc 终点 (10, 0)，会先发 move 然后 line
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
      move([0, 0]),
      line([50, 50]),
    ]);
  });

  it('circle 圆心带偏移', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [20, 30] },
            { type: 'step', kind: 'circlePath', radius: 5 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([25, 30]),
      ellipseArc([20, 30], 5, 5, 0, 360),
    ]);
  });
});
