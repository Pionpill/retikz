import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { arrowMarks } from '../helpers/arrow-marks';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((p): p is PathPrim => p.type === 'path');

const findArcCommand = (path: PathPrim) => path.commands.find(command => command.kind === 'arc');

const findEllipseArcCommand = (path: PathPrim) => path.commands.find(command => command.kind === 'ellipseArc');

const approximateEllipseArcLength = (
  radiusX: number,
  radiusY: number,
  startAngle: number,
  endAngle: number,
): number => {
  const segments = 20_000;
  let total = 0;
  let previous: [number, number] = [
    radiusX * Math.cos((startAngle * Math.PI) / 180),
    radiusY * Math.sin((startAngle * Math.PI) / 180),
  ];
  for (let index = 1; index <= segments; index += 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    const current: [number, number] = [
      radiusX * Math.cos((angle * Math.PI) / 180),
      radiusY * Math.sin((angle * Math.PI) / 180),
    ];
    total += Math.hypot(current[0] - previous[0], current[1] - previous[1]);
    previous = current;
  }
  return total;
};

describe('arrow + arc 端点收缩', () => {
  it('按圆弧长度收缩末端，而不是保留原 endAngle', () => {
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
    const path = findPathPrim(compileToScene(ir).scene.primitives)!;
    const arc = findArcCommand(path);
    const expectedAngle = 90 - (6 / 10) * (180 / Math.PI);

    expect(path.arrowEnd?.shape).toBe('normal');
    expect(arc?.endAngle).toBeCloseTo(expectedAngle, 8);
  });

  it('收缩起点时同步改写 move 与 startAngle', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('<-', { shape: 'open' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).scene.primitives)!;
    const arc = findArcCommand(path)!;
    const move = path.commands.find(command => command.kind === 'move');
    const expectedAngle = (5.25 / 10) * (180 / Math.PI);

    expect(arc.startAngle).toBeCloseTo(expectedAngle, 8);
    expect(move?.kind).toBe('move');
    if (move?.kind === 'move') {
      expect(move.to).toEqual([
        Math.round(10 * Math.cos((expectedAngle * Math.PI) / 180) * 100) / 100,
        Math.round(10 * Math.sin((expectedAngle * Math.PI) / 180) * 100) / 100,
      ]);
    }
  });

  it('按椭圆弧长度收缩末端', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->', { shape: 'open' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: { x: 20, y: 10 }, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };

    const path = findPathPrim(compileToScene(ir).scene.primitives)!;
    const arc = findEllipseArcCommand(path)!;

    expect(arc.endAngle).toBeLessThan(90);
    expect(approximateEllipseArcLength(20, 10, arc.endAngle, 90)).toBeCloseTo(5.25, 5);
  });

  it('双端箭头在同一圆弧上分别向内收缩', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('<->', { shape: 'open' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };

    const path = findPathPrim(compileToScene(ir).scene.primitives)!;
    const arc = findArcCommand(path)!;

    expect(arc.startAngle).toBeGreaterThan(0);
    expect(arc.endAngle).toBeLessThan(90);
    expect(arc.startAngle).toBeLessThan(arc.endAngle);
  });

  it('收缩量超过短弧长度时钳制为零长度弧', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('<->', { shape: 'open' }),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 1, startAngle: 0, endAngle: 10 },
          ],
        },
      ],
    };

    const path = findPathPrim(compileToScene(ir).scene.primitives)!;
    const arc = findArcCommand(path)!;

    expect(arc.startAngle).toBeCloseTo(arc.endAngle, 8);
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
    const p = findPathPrim(compileToScene(ir).scene.primitives)!;
    expect(p.commands.at(-1)).toEqual({ kind: 'close' });
  });
});
