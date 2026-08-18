import { describe, expect, it } from 'vitest';

import { PointChartType } from '../../src/point';
import {
  ConnectedPathPatchSchema,
  ConnectedPointPatchSchema,
  ConnectedScatterChartSchema,
} from '../../src/point/connected-scatter';

const minimalConnectedScatter = {
  namespace: 'chart',
  type: 'connected-scatter',
  plot: {
    data: { reference: 'rows' },
  },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
      order: 'month',
    },
  },
} as const;

const connectedPointPatchKeys = [
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

const connectedPathPatchKeys = [
  'blendMode',
  'connectNulls',
  'curve',
  'dashPattern',
  'fill',
  'fillRule',
  'label',
  'lineCap',
  'lineJoin',
  'marks',
  'opacity',
  'roundedCorners',
  'shadow',
  'stroke',
  'strokeOpacity',
  'strokeWidth',
  'thickness',
] as const;

describe('Connected Scatter Chart schema', () => {
  it('parses the minimal variant and survives a JSON round trip', () => {
    const parsed = ConnectedScatterChartSchema.parse(minimalConnectedScatter);

    expect(PointChartType.ConnectedScatter).toBe('connected-scatter');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each([
    ['constant color', { color: { value: '#2563eb' } }],
    ['field color', { color: { field: 'group' } }],
    ['scaled field color', { color: { field: 'group', scale: 'color' } }],
    ['series only', { series: 'region' }],
    ['series and constant color', { series: 'region', color: { value: '#2563eb' } }],
    ['series and field color', { series: 'region', color: { field: 'group' } }],
  ])('accepts %s', (_label, encoding) => {
    expect(
      ConnectedScatterChartSchema.parse({
        ...minimalConnectedScatter,
        config: {
          ...minimalConnectedScatter.config,
          encoding: { ...minimalConnectedScatter.config.encoding, ...encoding },
        },
      }).config.encoding,
    ).toMatchObject(encoding);
  });

  it.each([
    ['missing order', { x: { field: 'amount' }, y: { field: 'margin' } }],
    ['empty order', { ...minimalConnectedScatter.config.encoding, order: '' }],
    [
      'constant color with scale',
      { ...minimalConnectedScatter.config.encoding, color: { value: '#2563eb', scale: 'color' } },
    ],
    [
      'mixed color branches',
      { ...minimalConnectedScatter.config.encoding, color: { field: 'group', value: '#2563eb' } },
    ],
    ['unknown encoding key', { ...minimalConnectedScatter.config.encoding, unknown: 'field' }],
  ])('rejects %s', (_label, encoding) => {
    expect(() =>
      ConnectedScatterChartSchema.parse({
        ...minimalConnectedScatter,
        config: { ...minimalConnectedScatter.config, encoding },
      }),
    ).toThrow();
  });

  it('keeps the point patch as the Scatter allowlist without layer', () => {
    expect(Object.keys(ConnectedPointPatchSchema.shape).sort()).toEqual([...connectedPointPatchKeys].sort());
    expect(
      ConnectedPointPatchSchema.parse({
        color: { kind: 'constant', value: '#dc2626' },
        opacity: { kind: 'constant', value: 0.6 },
        label: { content: { value: 'A' } },
      }),
    ).toEqual({
      color: { kind: 'constant', value: '#dc2626' },
      opacity: { kind: 'constant', value: 0.6 },
      label: { content: { value: 'A' } },
    });
  });

  it('keeps the connection patch as an exact strict allowlist', () => {
    expect(Object.keys(ConnectedPathPatchSchema.shape).sort()).toEqual([...connectedPathPatchKeys].sort());
    expect(
      ConnectedPathPatchSchema.parse({
        curve: 'linear',
        connectNulls: true,
        strokeWidth: { kind: 'constant', value: 2 },
        opacity: { kind: 'constant', value: 0.5 },
      }),
    ).toEqual({
      curve: 'linear',
      connectNulls: true,
      strokeWidth: { kind: 'constant', value: 2 },
      opacity: { kind: 'constant', value: 0.5 },
    });
  });

  it.each(['layer', 'type', 'id', 'encoding', 'transform', 'coordinateView', 'size', 'unknown'])(
    'rejects protected or unknown point patch field %s',
    field => {
      expect(() => ConnectedPointPatchSchema.parse({ [field]: field === 'layer' ? { zIndex: 4 } : {} })).toThrow();
    },
  );

  it.each([
    'type',
    'id',
    'encoding',
    'order',
    'series',
    'closed',
    'closure',
    'transform',
    'coordinateView',
    'anchorId',
    'zIndex',
    'rotate',
    'scale',
    'layer',
    'unknown',
  ])('rejects protected or unknown connection patch field %s', field => {
    expect(() => ConnectedPathPatchSchema.parse({ [field]: field === 'closed' ? false : {} })).toThrow();
  });

  it('rejects spatial-root conflicts', () => {
    expect(() =>
      ConnectedScatterChartSchema.parse({
        ...minimalConnectedScatter,
        plot: {
          ...minimalConnectedScatter.plot,
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
