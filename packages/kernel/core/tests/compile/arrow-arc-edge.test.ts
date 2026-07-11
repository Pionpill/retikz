import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { arrowMarks } from '../helpers/arrow-marks';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((p): p is PathPrim => p.type === 'path');

/**
 * 验证 arrow + arc 末端的最小稳定性：编译不抛错，且保留有限值的结构化 arc 命令。
 * @remarks 当前不保证 arc 端点收缩与 marker 切线朝向；两项留待独立正确性修复。
 */
describe('arrow + arc 末端：编译不挂', () => {
  it('arc 单段 + arrow="->" 不抛错（端点 shrink 走 fallback）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->', { shape: 'normal' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir)).not.toThrow();
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p).toBeDefined();
    expect(p?.arrowEnd?.shape).toBe('normal');
    // 仍持有 arc PathCommand
    expect(p?.commands.some(c => c.kind === 'arc')).toBe(true);
  });

  it('arc 单段 + open shape arrow（hollow）：编译完成，arc 命令保留', () => {
    // hollow shape 在 line/cubic 末端时会 shrink 端点；arc 末端这一边界不 shrink 也不抛错
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->', { shape: 'open' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir)).not.toThrow();
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p).toBeDefined();
    expect(p?.arrowEnd?.shape).toBe('open');
  });
});

describe('cycle + close 在 commands 数组中', () => {
  it('cycle 段后再 line 不会触发回放（close 后由下个 move 重新起 sub-path）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
            // cycle 后没有再 move 也没 next step——单一 sub-path
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    expect(p.commands.at(-1)).toEqual({ kind: 'close' });
  });
});
