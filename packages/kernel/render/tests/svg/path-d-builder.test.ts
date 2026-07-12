import type { PathCommand } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildPathD } from '../../src/svg';

describe('buildPathD arc encoding', () => {
  it('splits a full counter-clockwise arc into two SVG arc commands', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [10, 0] },
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 360,
        endAngle: 0,
        counterClockwise: true,
      },
    ];

    const d = buildPathD(commands);

    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d).toContain('A 10 10 0 0 0 -10 0');
    expect(d).toContain('A 10 10 0 0 0 10 0');
  });

  it('encodes a full clockwise arc as two SVG arc commands', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 360, counterClockwise: false },
    ]);

    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d).toContain('A 10 10 0 0 1 -10 0');
    expect(d).toContain('A 10 10 0 0 1 10 0');
  });

  it('uses an explicit counter-clockwise direction for the long sweep', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90, counterClockwise: true },
    ]);

    expect(d).toContain('A 10 10 0 1 0 0 10');
  });

  it('uses an explicit clockwise direction for the long sweep', () => {
    const d = buildPathD([
      { kind: 'move', to: [0, 10] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 90, endAngle: 0, counterClockwise: false },
    ]);

    expect(d).toContain('A 10 10 0 1 1 10 0');
  });

  it('rotates ellipse arc endpoints with the ellipse', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 28] },
      {
        kind: 'ellipseArc',
        center: [10, 20],
        radiusX: 8,
        radiusY: 4,
        rotation: 90,
        startAngle: 0,
        endAngle: 90,
      },
    ]);

    expect(d).toContain('A 8 4 90 0 1 6 20');
  });

  it('moves to the geometric start when an arc is the first command', () => {
    expect(buildPathD([{ kind: 'arc', center: [20, 20], radius: 20, startAngle: 0, endAngle: 90 }])).toBe(
      'M 40 20 A 20 20 0 0 1 20 40',
    );
  });

  it('connects the current cursor to a mismatched arc start', () => {
    expect(
      buildPathD([
        { kind: 'move', to: [0, 0] },
        { kind: 'arc', center: [20, 20], radius: 20, startAngle: 0, endAngle: 90 },
      ]),
    ).toBe('M 0 0 L 40 20 A 20 20 0 0 1 20 40');
  });
});
