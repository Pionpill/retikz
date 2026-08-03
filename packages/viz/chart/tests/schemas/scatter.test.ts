import type { IRPlotPointEncoding } from '@retikz/plot';

import { PointMarkSchema } from '@retikz/plot';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRScatterPointPatch } from '../../src/schemas';

import {
  ChartSpecSchema,
  ChartType,
  ScatterChartSpecSchema,
  ScatterPointPatchSchema,
  StrictColorChannelSchema,
  StrictSizeChannelSchema,
} from '../../src/schemas';

const minimalScatter = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: {
    x: { field: 'amount' },
    y: { field: 'margin' },
  },
} as const;

const scatterOwnedPointKeys = new Set(['type', 'id', 'transform', 'coordinateView']);

describe('Scatter Chart schema', () => {
  it('parses the minimal variant and survives a JSON round trip', () => {
    const parsed = ScatterChartSpecSchema.parse(minimalScatter);

    expect(ChartType.Scatter).toBe('scatter');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(ChartSpecSchema.parse(minimalScatter)).toEqual(parsed);
  });

  it.each([
    [{ field: 'group' }, { field: 'weight' }],
    [{ value: '#2563eb' }, { value: 8 }],
    [
      { field: 'group', scale: 'color' },
      { field: 'weight', scale: 'radius' },
    ],
  ])('accepts strict color and size branches', (color, size) => {
    expect(
      ScatterChartSpecSchema.parse({
        ...minimalScatter,
        encoding: { ...minimalScatter.encoding, color, size },
      }).encoding,
    ).toMatchObject({ color, size });
  });

  it.each([
    ['color value with scale', { color: { value: '#2563eb', scale: 'color' } }],
    ['empty color value', { color: { value: '' } }],
    ['negative size value', { size: { value: -1 } }],
    ['size value with scale', { size: { value: 4, scale: 'radius' } }],
    ['mixed size branch', { size: { field: 'weight', value: 4 } }],
    ['unknown encoding key', { unknown: { field: 'weight' } }],
  ])('rejects %s', (_label, invalidEncoding) => {
    expect(() =>
      ScatterChartSpecSchema.parse({
        ...minimalScatter,
        encoding: { ...minimalScatter.encoding, ...invalidEncoding },
      }),
    ).toThrow();
  });

  it('projects every non-owned Point field instead of maintaining an allowlist', () => {
    const expectedKeys = Object.keys(PointMarkSchema.shape).filter(key => !scatterOwnedPointKeys.has(key));

    expect(Object.keys(ScatterPointPatchSchema.shape).sort()).toEqual(expectedKeys.sort());
    expect(
      ScatterPointPatchSchema.parse({
        size: { kind: 'constant', value: 8 },
        color: { kind: 'constant', value: '#dc2626' },
        opacity: { kind: 'constant', value: 0.6 },
        layer: { zIndex: 4 },
        label: { content: { value: 'A' } },
        encoding: {
          text: { value: 'A' },
          color: { field: 'group', scale: 'color' },
          channels: { halo: { value: 0.5 } },
          depth: { field: 'depth' },
        },
      }),
    ).toEqual({
      size: { kind: 'constant', value: 8 },
      color: { kind: 'constant', value: '#dc2626' },
      opacity: { kind: 'constant', value: 0.6 },
      layer: { zIndex: 4 },
      label: { content: { value: 'A' } },
      encoding: {
        text: { value: 'A' },
        color: { field: 'group', scale: 'color' },
        channels: { halo: { value: 0.5 } },
        depth: { field: 'depth' },
      },
    });
  });

  it.each(['type', 'id', 'transform', 'coordinateView', 'unknown'])(
    'rejects protected or unknown top-level point patch field %s',
    field => {
      expect(() => ScatterPointPatchSchema.parse({ [field]: {} })).toThrow();
    },
  );

  it.each(['x', 'y'])('rejects recipe-owned nested encoding field %s', field => {
    expect(() => ScatterPointPatchSchema.parse({ encoding: { [field]: { field: 'authored' } } })).toThrow();
  });

  it('excludes x/y statically while preserving custom coordinate roles', () => {
    expectTypeOf<{ encoding: { x: { field: string } } }>().not.toMatchTypeOf<IRScatterPointPatch>();
    expectTypeOf<{ encoding: { y: { field: string } } }>().not.toMatchTypeOf<IRScatterPointPatch>();
    expectTypeOf<{ encoding: { depth: { field: string } } }>().toMatchTypeOf<IRScatterPointPatch>();
    expectTypeOf<NonNullable<IRScatterPointPatch['encoding']>>().toMatchTypeOf<IRPlotPointEncoding>();
  });

  it('normalizes explicit undefined patch keys recursively to a JSON-safe canonical patch', () => {
    const parsed = ScatterPointPatchSchema.parse({ opacity: undefined, encoding: { text: undefined } });

    expect(parsed).toEqual({ encoding: {} });
    expect(Object.hasOwn(parsed, 'opacity')).toBe(false);
    expect(Object.hasOwn(parsed.encoding ?? {}, 'text')).toBe(false);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('normalizes explicit undefined keys throughout the complete Scatter variant', () => {
    const input = {
      ...minimalScatter,
      id: undefined,
      encoding: {
        ...minimalScatter.encoding,
        x: { field: 'amount', scale: undefined },
        size: { field: 'weight', scale: undefined, value: undefined },
        color: undefined,
      },
      mark: { opacity: undefined },
    };
    const parsed = ScatterChartSpecSchema.parse(input);

    expect(Object.hasOwn(parsed, 'id')).toBe(false);
    expect(Object.hasOwn(parsed.encoding, 'color')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.x, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.size ?? {}, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.size ?? {}, 'value')).toBe(false);
    expect(parsed.mark).toEqual({});
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(ChartSpecSchema.parse(input)).toEqual(parsed);
  });

  it('treats undefined opposite strict-channel keys as absent without accepting concrete conflicts', () => {
    expect(StrictColorChannelSchema.parse({ field: 'group', value: undefined })).toEqual({ field: 'group' });
    expect(StrictColorChannelSchema.parse({ value: '#2563eb', field: undefined, scale: undefined })).toEqual({
      value: '#2563eb',
    });
    expect(StrictSizeChannelSchema.parse({ field: 'weight', value: undefined })).toEqual({ field: 'weight' });
    expect(StrictSizeChannelSchema.parse({ value: 8, field: undefined, scale: undefined })).toEqual({ value: 8 });
    expect(() => StrictColorChannelSchema.parse({ field: 'group', value: '#2563eb' })).toThrow();
    expect(() => StrictSizeChannelSchema.parse({ field: 'weight', value: 8 })).toThrow();
  });

  it('rejects missing core channels and spatial-root conflicts', () => {
    expect(() => ScatterChartSpecSchema.parse({ ...minimalScatter, encoding: { x: { field: 'amount' } } })).toThrow();
    expect(() =>
      ScatterChartSpecSchema.parse({
        ...minimalScatter,
        coordinate: { type: 'cartesian2D' },
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
        },
      }),
    ).toThrow(/cannot use coordinate and composition together/);
  });
});
