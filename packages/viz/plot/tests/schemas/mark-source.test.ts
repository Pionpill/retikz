import { describe, expect, it } from 'vitest';

import { ChannelSchema, MarkOperationSchema, PointMarkSchema, PositionEncodingSchema } from '../../src';

describe('Mark Source field encodings and fixed properties', () => {
  it('preserves field strings and explicitly scaled bindings through JSON', () => {
    const input = {
      type: 'point',
      kind: 'data',
      encodings: {
        position: { x: 'height', y: 'weight' },
        color: { field: 'region', scale: 'regionColor' },
        size: 'population',
      },
      properties: { stroke: '#0f172a', strokeWidth: 2, opacity: { overall: 0.85 } },
      transforms: [],
    };
    const parsed = PointMarkSchema.parse(input);
    expect(parsed).toEqual({ ...input, properties: { ...input.properties, autoPadding: 'max-radius' } });
    expect(MarkOperationSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('accepts a field name or an explicit field and scale pair', () => {
    expect(ChannelSchema.parse('region')).toBe('region');
    expect(ChannelSchema.parse({ field: 'region', scale: 'palette' })).toEqual({
      field: 'region',
      scale: 'palette',
    });
  });

  it.each([
    '',
    '   ',
    { field: 'region' },
    { field: 'region', scale: '' },
    { value: 'red' },
    { field: 'region', scale: 'palette', value: 'red' },
  ])('rejects non-field or incomplete external channel input %j', input => {
    expect(ChannelSchema.safeParse(input).success).toBe(false);
  });

  it('keeps coordinate roles extensible while their bindings remain unscaled field strings', () => {
    expect(PositionEncodingSchema.parse({ longitude: 'lon', latitude: 'lat' })).toEqual({
      longitude: 'lon',
      latitude: 'lat',
    });
    expect(PositionEncodingSchema.safeParse({ ' ': 'value' }).success).toBe(false);
    const result = PositionEncodingSchema.safeParse({ x: { field: 'height', scale: 'x' } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'x')).toBe(true);
  });

  it('retains both authored sources so resolution can apply encoding precedence', () => {
    const input = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, color: 'group', opacity: { overall: 'alpha' } },
      properties: { color: 'red', opacity: { overall: 0.9, fill: 0.4, stroke: 0.7 } },
    };
    expect(PointMarkSchema.parse(input)).toEqual({
      ...input,
      properties: { ...input.properties, autoPadding: 'max-radius' },
    });
  });

  it('accepts mixed fixed and encoded annotation positions without binding wrappers', () => {
    const input = {
      type: 'point',
      kind: 'annotation',
      encodings: { position: { y: 'mean' }, color: 'group' },
      properties: { position: { x: { edge: 'end' } }, size: 4 },
      transforms: [],
    };
    const parsed = MarkOperationSchema.parse(input);
    expect(parsed).toMatchObject(input);
    expect(MarkOperationSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('keeps transforms omission distinct from an explicit empty chain', () => {
    const input = { type: 'point', kind: 'annotation', properties: { position: { x: 1, y: 2 } } };
    expect(MarkOperationSchema.parse(input)).not.toHaveProperty('transforms');
    expect(MarkOperationSchema.parse({ ...input, transforms: [] })).toHaveProperty('transforms', []);
  });

  it('keeps path geometry properties separate from series and order roles', () => {
    const input = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'time', y: 'value' }, series: 'group', order: 'time', strokeWidth: 'width' },
      properties: { curve: 'linear', strokeWidth: 2 },
    };
    expect(MarkOperationSchema.parse(input)).toEqual(input);
  });

  it('places interval construction modes in properties and endpoints in encodings', () => {
    const input = {
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'category' }, bounds: { y: { from: 'low', to: 'high' } } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'extent' } }, fill: 'blue' },
    };
    expect(MarkOperationSchema.parse(input)).toEqual(input);
  });

  it('uses the relation geometry discriminator independently of mark construction', () => {
    const input = {
      type: 'relation',
      kind: 'data',
      properties: { source: { id: 'a' }, target: { id: 'b' }, geometry: { kind: 'path' } },
    };
    expect(MarkOperationSchema.parse(input)).toEqual({
      ...input,
      properties: { ...input.properties, autoPadding: false },
    });
  });

  it.each([
    { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    { type: 'point', kind: 'data', color: { kind: 'constant', value: 'red' }, encoding: {} },
    { type: 'point', kind: 'annotation', position: { x: { field: 'x' }, y: 2 } },
    { type: 'point', kind: 'annotation', properties: { position: { x: 1, y: 2 } }, transform: [] },
    { type: 'relation', kind: 'ribbon', source: { id: 'a' }, target: { id: 'b' }, ribbon: { width: 2 } },
  ])('rejects obsolete external mark structures %j', input => {
    expect(MarkOperationSchema.safeParse(input).success).toBe(false);
  });

  it('validates extension binding shape without silently dropping malformed input', () => {
    const result = PointMarkSchema.safeParse({
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, custom: { value: 2 } },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'encodings')).toBe(true);
  });

  it('retains extension field bindings for registry validation', () => {
    const input = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, custom: 'value' },
    };
    expect(PointMarkSchema.parse(input)).toEqual(input);
  });

  it('separates ordered label content from its fixed host configuration', () => {
    const input = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, label: [{ content: 'name' }, { content: 'value' }] },
      properties: { label: [{ content: 'fixed', placement: 'outside' }, { displayFormat: '.2f' }] },
    };
    expect(PointMarkSchema.parse(input)).toMatchObject(input);
  });

  it.each([
    { properties: { color: { kind: 'constant', value: 'red' } } },
    { properties: { position: { x: { field: 'x' } } } },
    { encodings: { opacity: { unsupported: 'alpha' } } },
    { encodings: { color: { field: 'group' } } },
    { encodings: { channels: { custom: 'value' } } },
  ])('rejects obsolete wrappers or undeclared nested targets %j', fragment => {
    expect(PointMarkSchema.safeParse({ type: 'point', kind: 'data', ...fragment }).success).toBe(false);
  });

  it('encodes relation projections without putting field names in fixed targets', () => {
    const input = {
      type: 'relation',
      kind: 'data',
      encodings: {
        source: { position: { x: 'fromX', y: 'fromY' } },
        target: { position: { x: 'toX', y: 'toY' } },
        geometry: { width: 'flow' },
      },
      properties: { geometry: { kind: 'ribbon' } },
    };
    expect(MarkOperationSchema.parse(input)).toMatchObject(input);
  });

  it.each([
    { kind: 'path', route: [{ kind: 'line' }], routing: { kind: 'line' } },
    { kind: 'path', route: [{ kind: 'line' }], via: [{ id: 'c' }] },
    { kind: 'ribbon' },
    { kind: 'ribbon', width: 2, options: { interpolation: 'linear' } },
  ])('retains relation geometry validation %j', geometry => {
    expect(
      MarkOperationSchema.safeParse({
        type: 'relation',
        kind: 'data',
        properties: { source: { id: 'a' }, target: { id: 'b' }, geometry },
      }).success,
    ).toBe(false);
  });

  it('rejects endpoint glyphs on references that are not projected positions', () => {
    expect(
      MarkOperationSchema.safeParse({
        type: 'relation',
        kind: 'data',
        properties: {
          source: { id: 'a' },
          target: { id: 'b' },
          geometry: { kind: 'path' },
          endpoints: { source: { size: 3 } },
        },
      }).success,
    ).toBe(false);
  });

  it('accepts projected endpoint glyphs with direct constant properties', () => {
    const input = {
      type: 'relation',
      kind: 'data',
      encodings: { source: { position: { x: 'x', y: 'y' } }, target: { position: { x: 'u', y: 'v' } } },
      properties: { geometry: { kind: 'path' }, endpoints: { source: { size: 3, fill: 'red' } } },
    };
    expect(MarkOperationSchema.parse(input)).toMatchObject(input);
  });
});
