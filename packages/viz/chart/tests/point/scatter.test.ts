import type { IRPlotPointEncoding } from '@retikz/plot';

import { PointMarkSchema } from '@retikz/plot';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRScatterPointPatch } from '../../src/point/scatter';

import { PointChartType } from '../../src/point';
import { ScatterPointPatchSchema } from '../../src/point/scatter';
import { ScatterChartSchema } from '../../src/point/scatter';
import { StrictColorChannelSchema, StrictSizeChannelSchema } from '../../src/point/shared';

const minimalScatter = {
  namespace: 'chart',
  type: 'scatter',
  plot: {
    data: { reference: 'rows' },
  },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
    },
  },
} as const;

const scatterOwnedPointKeys = new Set(['type', 'id', 'transform', 'coordinateView']);

describe('Scatter Chart schema', () => {
  it('parses the minimal variant and survives a JSON round trip', () => {
    const parsed = ScatterChartSchema.parse(minimalScatter);

    expect(PointChartType.Scatter).toBe('scatter');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
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
      ScatterChartSchema.parse({
        ...minimalScatter,
        config: {
          ...minimalScatter.config,
          encoding: { ...minimalScatter.config.encoding, color, size },
        },
      }).config.encoding,
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
      ScatterChartSchema.parse({
        ...minimalScatter,
        config: {
          ...minimalScatter.config,
          encoding: { ...minimalScatter.config.encoding, ...invalidEncoding },
        },
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
      config: {
        encoding: {
          ...minimalScatter.config.encoding,
          x: { field: 'amount', scale: undefined },
          size: { field: 'weight', scale: undefined, value: undefined },
          color: undefined,
        },
        mark: { opacity: undefined },
      },
    };
    const parsed = ScatterChartSchema.parse(input);

    expect(Object.hasOwn(parsed, 'id')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding, 'color')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.x, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.size ?? {}, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.size ?? {}, 'value')).toBe(false);
    expect(parsed.config.mark).toEqual({});
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
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
    expect(() =>
      ScatterChartSchema.parse({
        ...minimalScatter,
        config: { encoding: { x: { field: 'amount' } } },
      }),
    ).toThrow();
    expect(() =>
      ScatterChartSchema.parse({
        ...minimalScatter,
        plot: {
          ...minimalScatter.plot,
          coordinate: { type: 'cartesian2D' },
          composition: {
            defaultView: 'main',
            views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
          },
        },
      }),
    ).toThrow(/cannot use coordinate and composition together/);
  });
});
