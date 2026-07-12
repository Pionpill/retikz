import type { PathCommand } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import {
  commandArcStart,
  commandArcSweep,
  commandEndpoint,
  commandEndTangent,
  commandStartTangent,
} from '../../src/shared/path-command';

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

  it('returns the rotated ellipse endpoint', () => {
    const command: PathCommand = {
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    };

    const point = commandEndpoint(command);

    expect(point?.[0]).toBeCloseTo(6);
    expect(point?.[1]).toBeCloseTo(20);
  });

  it('returns null for close commands', () => {
    expect(commandEndpoint({ kind: 'close' })).toBeNull();
  });
});

describe('commandArcStart', () => {
  it('returns the circular arc start point', () => {
    const point = commandArcStart({ kind: 'arc', center: [2, 3], radius: 10, startAngle: 180, endAngle: 270 });

    expect(point[0]).toBeCloseTo(-8);
    expect(point[1]).toBeCloseTo(3);
  });

  it('returns the rotated ellipse start point', () => {
    const point = commandArcStart({
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    });

    expect(point[0]).toBeCloseTo(10);
    expect(point[1]).toBeCloseTo(28);
  });
});

describe('commandArcSweep', () => {
  it('aligns explicit counter-clockwise input to a negative long sweep', () => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
        counterClockwise: true,
      }),
    ).toEqual({ start: 0, end: -270, direction: -1 });
  });

  it('aligns explicit clockwise input to a positive long sweep', () => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 90,
        endAngle: 0,
        counterClockwise: false,
      }),
    ).toEqual({ start: 90, end: 360, direction: 1 });
  });

  it.each([
    { counterClockwise: false, end: 360, direction: 1 },
    { counterClockwise: true, end: -360, direction: -1 },
  ] as const)('preserves a full circle direction: $counterClockwise', ({ counterClockwise, end, direction }) => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 360,
        counterClockwise,
      }),
    ).toEqual({ start: 0, end, direction });
  });

  it('normalizes sweeps larger than a full circle', () => {
    expect(commandArcSweep({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 720 })).toEqual({
      start: 0,
      end: 360,
      direction: 1,
    });
  });
});

describe('path command tangents', () => {
  it('uses the line direction at both endpoints', () => {
    const command: PathCommand = { kind: 'line', to: [3, 4] };

    expect(commandStartTangent(command, [0, 0])).toEqual([0.6, 0.8]);
    expect(commandEndTangent(command, [0, 0])).toEqual([0.6, 0.8]);
  });

  it('uses circular arc derivatives at start and end', () => {
    const command: PathCommand = { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 };
    const start = commandStartTangent(command, [10, 0]);
    const end = commandEndTangent(command, [10, 0]);

    expect(start?.[0]).toBeCloseTo(0);
    expect(start?.[1]).toBeCloseTo(1);
    expect(end?.[0]).toBeCloseTo(-1);
    expect(end?.[1]).toBeCloseTo(0);
  });

  it('reverses the derivative for counter-clockwise arcs', () => {
    const command: PathCommand = {
      kind: 'arc',
      center: [0, 0],
      radius: 10,
      startAngle: 0,
      endAngle: 90,
      counterClockwise: true,
    };
    const start = commandStartTangent(command, [10, 0]);

    expect(start?.[0]).toBeCloseTo(0);
    expect(start?.[1]).toBeCloseTo(-1);
  });

  it('rotates ellipse derivatives', () => {
    const command: PathCommand = {
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    };
    const end = commandEndTangent(command, commandArcStart(command));

    expect(end?.[0]).toBeCloseTo(0);
    expect(end?.[1]).toBeCloseTo(-1);
  });

  it('returns null for commands without a drawable tangent', () => {
    expect(commandStartTangent({ kind: 'move', to: [0, 0] }, null)).toBeNull();
    expect(commandEndTangent({ kind: 'close' }, [0, 0])).toBeNull();
    expect(commandStartTangent({ kind: 'line', to: [0, 0] }, null)).toBeNull();
    expect(
      commandStartTangent({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 45, endAngle: 45 }, null),
    ).toBeNull();
    expect(
      commandEndTangent({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 45, endAngle: 45 }, null),
    ).toBeNull();
  });
});
