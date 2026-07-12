import type { PathCommand } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { pathBounds } from '../../src/shared/path-bounds';

const expectBoundsClose = (
  actual: ReturnType<typeof pathBounds>,
  expected: { x: number; y: number; w: number; h: number },
): void => {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
  expect(actual.w).toBeCloseTo(expected.w, 8);
  expect(actual.h).toBeCloseTo(expected.h, 8);
};

describe('pathBounds', () => {
  it('uses the true quadratic extrema instead of the control point', () => {
    expectBoundsClose(
      pathBounds([
        { kind: 'move', to: [0, 0] },
        { kind: 'quad', control: [100, 100], to: [200, 0] },
      ]),
      { x: 0, y: 0, w: 200, h: 50 },
    );
  });

  it('solves cubic derivative roots on both axes', () => {
    expectBoundsClose(
      pathBounds([
        { kind: 'move', to: [0, 0] },
        { kind: 'cubic', control1: [0, 100], control2: [100, 100], to: [100, 0] },
      ]),
      { x: 0, y: 0, w: 100, h: 75 },
    );
  });

  it('limits circular bounds to the directed sweep', () => {
    expectBoundsClose(pathBounds([{ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 }]), {
      x: 0,
      y: 0,
      w: 10,
      h: 10,
    });
  });

  it('includes rotated ellipse extrema for a full sweep', () => {
    const halfExtent = Math.sqrt(58);
    expectBoundsClose(
      pathBounds([
        {
          kind: 'ellipseArc',
          center: [20, 30],
          radiusX: 10,
          radiusY: 4,
          rotation: 45,
          startAngle: 0,
          endAngle: 360,
        },
      ]),
      { x: 20 - halfExtent, y: 30 - halfExtent, w: 2 * halfExtent, h: 2 * halfExtent },
    );
  });

  it.each([
    {
      label: 'explicit counter-clockwise long sweep',
      command: { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90, counterClockwise: true },
    },
    {
      label: 'explicit clockwise long sweep',
      command: { kind: 'arc', center: [0, 0], radius: 10, startAngle: 90, endAngle: 0, counterClockwise: false },
    },
    {
      label: 'input beyond one revolution',
      command: { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 720 },
    },
  ] satisfies Array<{ label: string; command: PathCommand }>)('$label follows the aligned sweep', ({ command }) => {
    expectBoundsClose(pathBounds([command]), { x: -10, y: -10, w: 20, h: 20 });
  });

  it('keeps a zero sweep as a finite point bound', () => {
    expectBoundsClose(pathBounds([{ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 0 }]), {
      x: 10,
      y: 0,
      w: 0,
      h: 0,
    });
  });

  it('includes the implicit connector when the cursor differs from the arc start', () => {
    expectBoundsClose(
      pathBounds([
        { kind: 'move', to: [0, 0] },
        { kind: 'arc', center: [20, 20], radius: 20, startAngle: 0, endAngle: 90 },
      ]),
      { x: 0, y: 0, w: 40, h: 40 },
    );
  });

  it('tracks close and multiple subpath cursors', () => {
    expectBoundsClose(
      pathBounds([
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
        { kind: 'close' },
        { kind: 'line', to: [0, 10] },
        { kind: 'move', to: [-5, -5] },
        { kind: 'line', to: [-2, -1] },
      ]),
      { x: -5, y: -5, w: 15, h: 15 },
    );
  });

  it('returns a finite zero bbox for move-only input', () => {
    expect(pathBounds([{ kind: 'move', to: [12, 34] }])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});
