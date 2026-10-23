import { describe, expect, it } from 'vitest';

import { PointMarkEncodingSchema, PointMarkSchema, PathMarkSchema, IntervalMarkSchema } from '../../src/schemas';
import { ChannelSchema, PositionEncodingSchema, PositionInputSchema } from '../../src/schemas/encoding';

describe('Field encoding contract', () => {
  it('preserves nested field paths and explicit scale references', () => {
    expect(ChannelSchema.parse('user.age')).toBe('user.age');
    const binding = { field: 'continent', scale: 'col' };
    expect(ChannelSchema.parse(binding)).toEqual(binding);
  });

  it.each([
    { value: 0 },
    { value: null },
    { value: { nested: [true, null] } },
    { field: 'x' },
    { field: 'x', value: 1 },
    {},
    { field: 'x', scale: 's', extra: true },
  ])('rejects constants and incomplete or undeclared binding members: %j', input => {
    expect(ChannelSchema.safeParse(input).success).toBe(false);
  });

  it('groups closed coordinate roles separately from visual targets through JSON', () => {
    const input = {
      position: { x: { field: 'longitude' }, y: { field: 'latitude' } },
      color: { field: 'continent', scale: 'col' },
    };
    expect(PointMarkEncodingSchema.parse(input)).toEqual(input);
    expect(PointMarkEncodingSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
  });

  it.each([
    { x: { field: 'theta' } },
    { x: { value: 1 }, y: { edge: 'end' } },
    { x: { value: 1 }, y: { field: 'height' }, z: { edge: 'end' } },
  ])('accepts consecutive position roles in one, two or three dimensions: %j', position => {
    expect(PositionEncodingSchema.parse(position)).toEqual(position);
  });
  it.each([{}, { y: { value: 1 } }, { x: { value: 1 }, z: { edge: 'end' } }, { x: { value: 1 }, u: { value: 2 } }])(
    'rejects skipped or unknown position roles: %j',
    position => {
      expect(PositionEncodingSchema.safeParse(position).success).toBe(false);
    },
  );
  it.each([{ field: 'a.b' }, { value: 12 }, { value: 'May' }, { edge: 'start' }, { edge: 'end' }])(
    'round-trips a position source: %j',
    input => {
      expect(PositionInputSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
    },
  );
  it.each([
    'x',
    1,
    {},
    { field: 'x', value: 1 },
    { value: 1, edge: 'start' },
    { edge: 'middle' },
    { value: Infinity },
    { value: null },
    { field: 'x', scale: 's' },
  ])('rejects invalid or mixed position sources: %j', input => {
    expect(PositionInputSchema.safeParse(input).success).toBe(false);
  });

  it('rejects blank role keys and nested role binding objects', () => {
    expect(PositionEncodingSchema.safeParse({ ' ': 'longitude' }).success).toBe(false);
    expect(PositionEncodingSchema.safeParse({ x: { field: 'longitude', extra: true } }).success).toBe(false);
    expect(PointMarkEncodingSchema.safeParse({ position: { ' ': 'longitude' } }).success).toBe(false);
  });

  it('supports size and shape as field targets and retains registered extension candidates', () => {
    const input = {
      position: { x: { field: 'x' }, y: { field: 'y' } },
      size: 'population',
      shape: 'category',
      custom: 'value',
    };
    expect(PointMarkEncodingSchema.parse(input)).toEqual(input);
    expect(
      PointMarkEncodingSchema.parse({ position: { x: { value: 1 } }, size: { field: 'p', scale: 'sizes' } }),
    ).toEqual({
      position: { x: { value: 1 } },
      size: { field: 'p', scale: 'sizes' },
    });
  });

  it('validates fixed sizes and shapes in properties rather than field encodings', () => {
    expect(
      PointMarkSchema.parse({
        type: 'point',
        encodings: { position: { x: { value: 1 } } },
        properties: { size: 8, shape: 'diamond' },
      }).properties,
    ).toMatchObject({ size: 8, shape: 'diamond' });
    for (const size of [-3, 'big']) {
      expect(
        PointMarkSchema.safeParse({ type: 'point', encodings: { position: { x: { value: 1 } } }, properties: { size } })
          .success,
      ).toBe(false);
    }
    expect(PointMarkEncodingSchema.safeParse({ shape: { value: 'diamond' } }).success).toBe(false);
  });
});

describe('Mark position geometry inputs', () => {
  const start = { x: { edge: 'start' }, y: { value: 10 } };
  const end = { x: { edge: 'end' }, y: { value: 10 } };

  it('accepts complete endpoints and keeps default domain contribution', () => {
    const mark = { type: 'path', encodings: { from: start, to: end } };
    expect(PathMarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toMatchObject({ ...mark, contributeToDomain: true });
  });

  it.each([
    { position: start, from: start, to: end },
    { from: start },
    { from: start, to: end, series: 'group' },
    { from: start, to: end, order: 'order' },
  ])('rejects mixed or incomplete path geometry: %j', encodings => {
    expect(PathMarkSchema.safeParse({ type: 'path', encodings }).success).toBe(false);
  });

  it('accepts independently sourced extent endpoints on x/y', () => {
    const mark = {
      type: 'interval',
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
      encodings: {
        bounds: {
          x: { from: { edge: 'start' }, to: { edge: 'end' } },
          y: { from: { field: 'low' }, to: { value: 20 } },
        },
      },
    };
    expect(IntervalMarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toMatchObject(mark);
  });

  it('rejects z and arbitrary interval roles in all position structures', () => {
    for (const mark of [
      { type: 'interval', encodings: { position: { x: { value: 1 }, z: { value: 2 } } } },
      { type: 'interval', encodings: { bounds: { z: { from: { value: 1 }, to: { value: 2 } } } } },
      { type: 'interval', properties: { bounds: { z: { kind: 'full' } } } },
    ])
      expect(IntervalMarkSchema.safeParse(mark).success).toBe(false);
  });

  it('rejects obsolete kind and property positions instead of converting them', () => {
    expect(PointMarkSchema.safeParse({ type: 'point', kind: 'data', encodings: { position: start } }).success).toBe(
      false,
    );
    expect(
      PointMarkSchema.safeParse({ type: 'point', encodings: { position: start }, properties: { position: { x: 1 } } })
        .success,
    ).toBe(false);
  });
});

it('round-trips shorthand labels and rejects cross-host or invalid font bindings', () => {
  const point = {
    type: 'point',
    encodings: { label: ['name', { font: { family: 'family', size: 'size' } }] },
    properties: { label: ['fixed', { text: 'other' }] },
  };
  expect(PointMarkSchema.parse(JSON.parse(JSON.stringify(point)))).toMatchObject(point);
  expect(PointMarkSchema.safeParse({ type: 'point', encodings: { label: { sloped: 's' } } }).success).toBe(false);
  expect(PathMarkSchema.safeParse({ type: 'path', encodings: { label: { rotate: 'r' } } }).success).toBe(false);
  expect(
    PointMarkSchema.safeParse({ type: 'point', encodings: { label: { font: { family: { field: 'f', scale: 's' } } } } })
      .success,
  ).toBe(false);
});
