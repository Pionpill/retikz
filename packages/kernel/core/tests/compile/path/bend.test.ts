import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { cubic, line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'bend'", () => {
  it('bend left 30° on horizontal chord → C 命令，控制点 y < 0', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
          ],
        },
      ],
    };
    // offset =（chord/2）× tan(15°) × 4/3（apexOffset 为圆弧 sagitta，chord=12 → 6）
    const offset = (6 * Math.tan((15 * Math.PI) / 180) * 4) / 3;
    const r = (n: number) => Math.round(n * 100) / 100;
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([4, r(-offset)], [8, r(-offset)], [12, 0]),
    ]);
  });

  it('bend 默认角度 30°（省略 bendAngle）等价于显式 30°', () => {
    const irImplicit: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left' },
          ],
        },
      ],
    };
    const irExplicit: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(irImplicit).primitives).commands).toEqual(
      findPathPrim(compileToScene(irExplicit).primitives).commands,
    );
  });

  it('bend right 与 left 关于 chord 对称（控制点 y 互为相反数）', () => {
    const irL: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 45 },
          ],
        },
      ],
    };
    const irR: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'right', bendAngle: 45 },
          ],
        },
      ],
    };
    const cmdsL = findPathPrim(compileToScene(irL).primitives).commands;
    const cmdsR = findPathPrim(compileToScene(irR).primitives).commands;
    // 期望第二个 command 是 cubic：control 点 y 关于 chord 对称
    const cubL = cmdsL[1];
    const cubR = cmdsR[1];
    expect(cubL.kind).toBe('cubic');
    expect(cubR.kind).toBe('cubic');
    if (cubL.kind !== 'cubic' || cubR.kind !== 'cubic') return;
    expect(cubL.control1[1]).toBeCloseTo(-cubR.control1[1], 4);
    expect(cubL.control2[1]).toBeCloseTo(-cubR.control2[1], 4);
  });

  it('bend 与 line 混用', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
            { type: 'step', kind: 'line', to: [20, 0] },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 起头是 move(0,0) → cubic ...，结尾是 line(20, 0)
    expect(commands[0]).toEqual(move([0, 0]));
    expect(commands[1].kind).toBe('cubic');
    expect(commands[commands.length - 1]).toEqual(line([20, 0]));
  });
});
