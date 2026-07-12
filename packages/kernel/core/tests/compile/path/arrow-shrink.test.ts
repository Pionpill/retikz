import { describe, expect, it } from 'vitest';

import type { PathCommand } from '../../../src/contract';

import { applyArrowShrinks } from '../../../src/compile/path/stroke/shrink';

const identity = (value: number) => value;

const arcOf = (commands: Array<PathCommand>) => {
  const command = commands.find(item => item.kind === 'arc');
  if (command?.kind !== 'arc') throw new Error('Expected arc command');
  return command;
};

const ellipseArcOf = (commands: Array<PathCommand>) => {
  const command = commands.find(item => item.kind === 'ellipseArc');
  if (command?.kind !== 'ellipseArc') throw new Error('Expected ellipseArc command');
  return command;
};

describe('applyArrowShrinks arc commands', () => {
  it('按 rotation 计算 ellipseArc 收缩后的起点与 move', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 8] },
      {
        kind: 'ellipseArc',
        center: [0, 0],
        radiusX: 8,
        radiusY: 4,
        rotation: 90,
        startAngle: 0,
        endAngle: 90,
      },
    ];

    applyArrowShrinks(commands, { shrinkStart: 1, shrinkEnd: 0, strokeWidth: 1, round: identity });

    const arc = ellipseArcOf(commands);
    const move = commands[0];
    const angle = (arc.startAngle * Math.PI) / 180;
    const expected: [number, number] = [-4 * Math.sin(angle), 8 * Math.cos(angle)];
    expect(move.kind).toBe('move');
    if (move.kind === 'move') {
      expect(move.to[0]).toBeCloseTo(expected[0], 8);
      expect(move.to[1]).toBeCloseTo(expected[1], 8);
    }
  });

  it('显式 counterClockwise=true 把 0→90 对齐为 -270° 长弧', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90, counterClockwise: true },
    ];

    applyArrowShrinks(commands, { shrinkStart: 1, shrinkEnd: 0, strokeWidth: 1, round: identity });

    expect(arcOf(commands).startAngle).toBeCloseTo(-(1 / 10) * (180 / Math.PI), 8);
  });

  it('显式 counterClockwise=false 把 90→0 对齐为 +270° 长弧', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 10] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 90, endAngle: 0, counterClockwise: false },
    ];

    applyArrowShrinks(commands, { shrinkStart: 1, shrinkEnd: 0, strokeWidth: 1, round: identity });

    expect(arcOf(commands).startAngle).toBeCloseTo(90 + (1 / 10) * (180 / Math.PI), 8);
  });

  it.each([
    { counterClockwise: false, direction: 1 },
    { counterClockwise: true, direction: -1 },
  ])('整圆双端按显式方向精确收缩：$counterClockwise', ({ counterClockwise, direction }) => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 360, counterClockwise },
    ];

    applyArrowShrinks(commands, { shrinkStart: 1, shrinkEnd: 1, strokeWidth: 1, round: identity });

    const delta = (1 / 10) * (180 / Math.PI);
    const arc = arcOf(commands);
    expect(arc.startAngle).toBeCloseTo(direction * delta, 8);
    expect(arc.endAngle).toBeCloseTo(direction * (360 - delta), 8);
    const move = commands[0];
    expect(move.kind).toBe('move');
    if (move.kind === 'move') {
      expect(move.to[0]).toBeCloseTo(10 * Math.cos((direction * delta * Math.PI) / 180), 8);
      expect(move.to[1]).toBeCloseTo(10 * Math.sin((direction * delta * Math.PI) / 180), 8);
    }
  });
});
