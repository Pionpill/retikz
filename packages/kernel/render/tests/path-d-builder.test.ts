import type { PathCommand } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildPathD } from '../src/svg';

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
});
