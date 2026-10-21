import type { Position } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { PositionScale } from '../../../src/contract';
import { createCoordinateFrame } from '../../../src/contract';
import { createPolarCoordinate } from '../../../src/providers';
import { lowerAnnotation } from '../../../src/providers/mark/features/annotation';
import { IntervalAnnotationSchema, PathAnnotationSchema } from '../../../src/schemas';

const scale: PositionScale = {
  coordinate: value => Number(value),
  domain: () => [0, 60, 120, 180, 240, 300],
  bandwidth: 60,
  step: 60,
  range: () => [0, 360],
  setRange: () => undefined,
  ticks: () => ({ values: [], labels: [] }),
};
const polar = (interpolation: 'polar' | 'chord' = 'chord') =>
  createPolarCoordinate({
    center: [0, 0],
    innerRadius: 0,
    outerRadius: 100,
    startAngle: 0,
    endAngle: 360,
    interpolation,
    angularSkeleton: [0, 60, 120, 180, 240, 300],
    primary: scale,
    secondary: scale,
  });
const area = (points: Array<Position>) =>
  Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0),
  ) / 2;

describe('coordinate connection geometry', () => {
  it('interpolates mapped radii at intermediate categories and reverses the same path', () => {
    const frame = polar();
    const points = frame.projectSegment!([0, 20], [120, 80])!;
    expect(points).toHaveLength(3);
    expect(points[1][0]).toBeCloseTo(25);
    expect(points[1][1]).toBeCloseTo(50 * Math.sin(Math.PI / 3));
    expect(frame.projectSegment!([120, 80], [0, 20])).toEqual([...points].reverse());
    const full = frame.projectSegment!([0, 50], [360, 50])!;
    expect(full).toHaveLength(7);
    expect(full.at(-1)![0]).toBeCloseTo(full[0][0]);
    expect(full.at(-1)![1]).toBeCloseTo(full[0][1]);
  });

  it('keeps a category range as an area while explicit straight corners can collapse', () => {
    const frame = polar();
    const cell = { intervals: { x: [60, 240] as [number, number], y: [20, 80] as [number, number] } };
    const coordinate = frame.projectCell(cell, { connection: 'coordinate' });
    const straight = frame.projectCell(cell, { connection: 'straight' });
    expect(coordinate.kind).toBe('contour');
    expect(straight.kind).toBe('contour');
    if (coordinate.kind === 'contour' && straight.kind === 'contour') {
      expect(coordinate.points).toHaveLength(8);
      expect(area(coordinate.points)).toBeGreaterThan(1000);
      expect(straight.points).toHaveLength(4);
      expect(area(straight.points)).toBeCloseTo(0);
    }
    const full = frame.projectCell({ intervals: { x: [0, 360], y: [20, 80] } });
    expect(full.kind).toBe('contour');
    if (full.kind === 'contour') expect(area(full.points)).toBeGreaterThan(10000);
  });

  it('retains continuous polar arcs and sectors while allowing straight cell boundaries', () => {
    const frame = polar('polar');
    const points = frame.projectSegment!([0, 50], [120, 50])!;
    expect(points.length).toBeGreaterThan(3);
    for (const point of points) expect(Math.hypot(...point)).toBeCloseTo(50);
    const cell = { intervals: { x: [0, 120] as [number, number], y: [20, 80] as [number, number] } };
    expect(frame.projectCell(cell).kind).toBe('sector');
    expect(frame.projectCell(cell, { connection: 'straight' }).kind).toBe('contour');
  });

  it('uses custom coordinate capabilities and fails rather than silently drawing a straight path', () => {
    const frame = createCoordinateFrame('curved', ['u', 'v'], () => [0, 0], {
      roleScales: { u: scale, v: scale },
      projectMappedRoles: values => [values[0], values[1]],
      projectSegment: (from, to) => [
        [from[0], from[1]],
        [50, 90],
        [to[0], to[1]],
      ],
      projectCell: (_cell, options) => ({
        kind: 'contour',
        points:
          options?.connection === 'straight'
            ? [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
              ]
            : [
                [0, 0],
                [50, -30],
                [100, 0],
                [100, 100],
                [0, 100],
              ],
      }),
    });
    const path = PathAnnotationSchema.parse({
      type: 'path',
      kind: 'annotation',
      properties: { from: { u: 0, v: 0 }, to: { u: 100, v: 0 } },
    });
    const output = lowerAnnotation(path, frame, {});
    expect(output).toMatchObject({ children: [{ children: [{ to: [0, 0] }, { to: [50, 90] }, { to: [100, 0] }] }] });
    const { projectSegment: _segment, ...unsupported } = frame;
    expect(() => lowerAnnotation(path, unsupported, {})).toThrow(/projectSegment/);
    expect(
      lowerAnnotation({ ...path, properties: { ...path.properties, connection: 'straight' } }, unsupported, {}),
    ).toMatchObject({
      children: [{ children: [{ to: [0, 0] }, { to: [100, 0] }] }],
    });
    const interval = IntervalAnnotationSchema.parse({
      type: 'interval',
      kind: 'annotation',
      properties: { connection: 'straight', bounds: { u: { from: 0, to: 100 }, v: { from: 0, to: 100 } } },
    });
    expect(lowerAnnotation(interval, frame, {})).toMatchObject({
      children: [
        {
          shape: {
            params: {
              points: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
              ],
            },
          },
        },
      ],
    });
  });
});
