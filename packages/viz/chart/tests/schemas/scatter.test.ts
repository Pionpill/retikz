import { describe, expect, it } from 'vitest';

import { ChartSpecSchema, ScatterChartSpecSchema, ScatterChartType, ScatterPointPatchSchema } from '../../src/schemas';

const minimalScatter = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: {
    x: { field: 'amount' },
    y: { field: 'margin' },
  },
} as const;

const scatterPointPatchKeys = [
  'align',
  'anchorId',
  'blendMode',
  'boundary',
  'color',
  'cornerRadius',
  'dashPattern',
  'dashed',
  'dotted',
  'dx',
  'dy',
  'fill',
  'fillOpacity',
  'font',
  'label',
  'layer',
  'lineHeight',
  'margin',
  'maxTextWidth',
  'minimumSize',
  'opacity',
  'padding',
  'rotate',
  'scale',
  'shadow',
  'shape',
  'stroke',
  'strokeOpacity',
  'strokeWidth',
  'textColor',
  'zIndex',
] as const;

describe('Scatter Chart schema', () => {
  it('parses the minimal variant and survives a JSON round trip', () => {
    const parsed = ScatterChartSpecSchema.parse(minimalScatter);

    expect(ScatterChartType).toBe('scatter');
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

  it('keeps the point patch as an exact strict allowlist', () => {
    expect(Object.keys(ScatterPointPatchSchema.shape).sort()).toEqual([...scatterPointPatchKeys].sort());
    expect(
      ScatterPointPatchSchema.parse({
        color: { kind: 'constant', value: '#dc2626' },
        opacity: { kind: 'constant', value: 0.6 },
        layer: { zIndex: 4 },
        label: { content: { value: 'A' } },
      }),
    ).toEqual({
      color: { kind: 'constant', value: '#dc2626' },
      opacity: { kind: 'constant', value: 0.6 },
      layer: { zIndex: 4 },
      label: { content: { value: 'A' } },
    });
  });

  it.each(['type', 'id', 'encoding', 'transform', 'coordinateView', 'size', 'unknown'])(
    'rejects protected or unknown point patch field %s',
    field => {
      expect(() =>
        ScatterPointPatchSchema.parse({ [field]: field === 'size' ? { kind: 'constant', value: 4 } : {} }),
      ).toThrow();
    },
  );

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
