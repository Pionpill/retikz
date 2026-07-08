import { describe, expect, it } from 'vitest';

import { commandEndpoint } from '../../src/shared/path-command';

describe('commandEndpoint', () => {
  it('returns the `to` point for line-like commands', () => {
    expect(commandEndpoint({ kind: 'line', to: [3, 4] })).toEqual([3, 4]);
  });

  it('returns the polar endpoint for circular arcs', () => {
    expect(commandEndpoint({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 0 })).toEqual([10, 0]);
  });

  it('returns the ellipse endpoint from radiusX and radiusY', () => {
    const point = commandEndpoint({
      kind: 'ellipseArc',
      center: [0, 0],
      radiusX: 10,
      radiusY: 5,
      startAngle: 0,
      endAngle: 90,
    });
    expect(point?.[0]).toBeCloseTo(0);
    expect(point?.[1]).toBeCloseTo(5);
  });

  it('returns null for close commands', () => {
    expect(commandEndpoint({ kind: 'close' })).toBeNull();
  });
});
