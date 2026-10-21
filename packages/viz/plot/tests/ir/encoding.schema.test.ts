import { describe, expect, it } from 'vitest';

import { PointMarkSchema } from '../../src/schemas';
import { ChannelSchema, EncodingSchema, PointEncodingSchema, PositionEncodingSchema } from '../../src/schemas/encoding';

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

  it('groups extensible coordinate roles separately from visual targets through JSON', () => {
    const input = { position: { u: 'longitude', v: 'latitude' }, color: { field: 'continent', scale: 'col' } };
    expect(EncodingSchema.parse(input)).toEqual(input);
    expect(EncodingSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
  });

  it.each([{}, { x: 'theta' }, { y: 'value' }])(
    'leaves coordinate role completeness to coordinate resolution: %j',
    position => {
      expect(EncodingSchema.parse({ position })).toEqual({ position });
    },
  );

  it('rejects blank role keys and nested role binding objects', () => {
    expect(PositionEncodingSchema.safeParse({ ' ': 'longitude' }).success).toBe(false);
    expect(PositionEncodingSchema.safeParse({ x: { field: 'longitude', extra: true } }).success).toBe(false);
    expect(PointEncodingSchema.safeParse({ position: { ' ': 'longitude' } }).success).toBe(false);
  });

  it('supports size and shape as field targets and retains registered extension candidates', () => {
    const input = { position: { x: 'x', y: 'y' }, size: 'population', shape: 'category', custom: 'value' };
    expect(PointEncodingSchema.parse(input)).toEqual(input);
    expect(PointEncodingSchema.parse({ size: { field: 'p', scale: 'sizes' } })).toEqual({
      size: { field: 'p', scale: 'sizes' },
    });
  });

  it('validates fixed sizes and shapes in properties rather than field encodings', () => {
    expect(
      PointMarkSchema.parse({ type: 'point', kind: 'data', properties: { size: 8, shape: 'diamond' } }).properties,
    ).toMatchObject({ size: 8, shape: 'diamond' });
    for (const size of [-3, 'big']) {
      expect(PointMarkSchema.safeParse({ type: 'point', kind: 'data', properties: { size } }).success).toBe(false);
    }
    expect(PointEncodingSchema.safeParse({ shape: { value: 'diamond' } }).success).toBe(false);
  });
});
