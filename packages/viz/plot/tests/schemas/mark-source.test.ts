import { describe, expect, it } from 'vitest';
import { treeifyError } from 'zod';

import { ChannelSchema, MarkSchema, PointMarkSchema, PositionEncodingSchema } from '../../src';

describe('Mark Source field encodings and fixed properties', () => {
  it('preserves field strings and explicitly scaled bindings through JSON', () => {
    const input = {
      type: 'point',
      encodings: {
        position: { x: { field: 'height' }, y: { field: 'weight' } },
        color: { field: 'region', scale: 'regionColor' },
        size: 'population',
      },
      properties: { stroke: '#0f172a', strokeWidth: 2, opacity: { overall: 0.85 } },
      transforms: [],
    };
    const parsed = PointMarkSchema.parse(input);
    expect(parsed).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: 'max-radius' },
    });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
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

  it('restricts coordinate roles to x/y/z and rejects scaled position inputs', () => {
    expect(PositionEncodingSchema.safeParse({ longitude: { field: 'lon' }, latitude: { field: 'lat' } }).success).toBe(
      false,
    );
    expect(PositionEncodingSchema.safeParse({ ' ': 'value' }).success).toBe(false);
    const result = PositionEncodingSchema.safeParse({ x: { field: 'height', scale: 'x' } });
    expect(result.success).toBe(false);
    if (!result.success) expect(treeifyError(result.error).properties).toHaveProperty('x');
  });

  it('retains both authored sources so resolution can apply encoding precedence', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, color: 'group', opacity: { overall: 'alpha' } },
      properties: { color: 'red', opacity: { overall: 0.9, fill: 0.4, stroke: 0.7 } },
    };
    expect(PointMarkSchema.parse(input)).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: 'max-radius' },
    });
  });

  it('accepts mixed fixed and encoded annotation positions without binding wrappers', () => {
    const input = {
      type: 'point',
      encodings: { color: 'group', position: { x: { edge: 'end' }, y: { field: 'mean' } } },
      properties: { size: 4 },
      transforms: [],
      contributeToDomain: false,
    };
    const parsed = MarkSchema.parse(input);
    expect(parsed).toMatchObject(input);
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('keeps transforms omission distinct from an explicit empty chain', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: {},
      contributeToDomain: false,
    };
    expect(MarkSchema.parse(input)).not.toHaveProperty('transforms');
    expect(MarkSchema.parse({ ...input, transforms: [] })).toHaveProperty('transforms', []);
  });

  it('keeps path geometry properties separate from series and order roles', () => {
    const input = {
      type: 'path',
      encodings: {
        position: { x: { field: 'time' }, y: { field: 'value' } },
        series: 'group',
        order: 'time',
        strokeWidth: 'width',
      },
      properties: { connection: 'coordinate', curve: 'linear', strokeWidth: 2 },
    };
    expect(MarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('places interval construction modes in properties and endpoints in encodings', () => {
    const input = {
      type: 'interval',
      encodings: {
        position: { x: { field: 'category' } },
        bounds: { y: { from: { field: 'low' }, to: { field: 'high' } } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'extent' } }, fill: 'blue' },
    };
    expect(MarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('uses the relation geometry discriminator independently of mark construction', () => {
    const input = {
      type: 'relation',
      properties: {
        source: { anchorId: { template: 'a' } },
        target: { anchorId: { template: 'b' } },
        geometry: { kind: 'path' },
      },
    };
    expect(MarkSchema.parse(input)).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: false },
    });
  });

  it.each([
    { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    { type: 'point', color: { kind: 'constant', value: 'red' }, encoding: {} },
    { type: 'point', position: { x: { field: 'x' }, y: { value: 2 } }, contributeToDomain: false },
    {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: {},
      transform: [],
      contributeToDomain: false,
    },
    {
      type: 'relation',
      kind: 'ribbon',
      source: { anchorId: { template: 'a' } },
      target: { anchorId: { template: 'b' } },
      ribbon: { width: 2 },
    },
  ])('rejects obsolete external mark structures %j', input => {
    expect(MarkSchema.safeParse(input).success).toBe(false);
  });

  it('validates extension binding shape without silently dropping malformed input', () => {
    const result = PointMarkSchema.safeParse({
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, custom: { value: 2 } },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'encodings')).toBe(true);
  });

  it('retains extension field bindings for registry validation', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, custom: 'value' },
    };
    expect(PointMarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('separates ordered label content from its fixed host configuration', () => {
    const input = {
      type: 'point',
      encodings: {
        position: { x: { field: 'x' }, y: { field: 'y' } },
        label: [{ text: 'name' }, { text: 'value' }],
      },
      properties: { label: [{ text: 'fixed', placement: 'outside' }, { displayFormat: '.2f' }] },
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
    expect(PointMarkSchema.safeParse({ type: 'point', ...fragment }).success).toBe(false);
  });

  it('encodes relation projections without putting field names in fixed targets', () => {
    const input = {
      type: 'relation',
      encodings: {
        source: { position: { x: { field: 'fromX' }, y: { field: 'fromY' } } },
        target: { position: { x: { field: 'toX' }, y: { field: 'toY' } } },
        geometry: { width: 'flow' },
      },
      properties: { geometry: { kind: 'ribbon' } },
    };
    expect(MarkSchema.parse(input)).toMatchObject(input);
  });

  it.each([
    { kind: 'path', route: [{ kind: 'line' }], routing: { kind: 'line' } },
    { kind: 'path', route: [{ kind: 'line' }], via: [{ id: 'c' }] },
    { kind: 'ribbon' },
    { kind: 'ribbon', width: 2, options: { interpolation: 'linear' } },
  ])('retains relation geometry validation %j', geometry => {
    expect(
      MarkSchema.safeParse({
        type: 'relation',
        properties: { source: { anchorId: { template: 'a' } }, target: { anchorId: { template: 'b' } }, geometry },
      }).success,
    ).toBe(false);
  });

  it('rejects endpoint glyphs on references that are not projected positions', () => {
    expect(
      MarkSchema.safeParse({
        type: 'relation',
        properties: {
          source: { anchorId: { template: 'a' } },
          target: { anchorId: { template: 'b' } },
          geometry: { kind: 'path' },
          endpoints: { source: { size: 3 } },
        },
      }).success,
    ).toBe(false);
  });

  it('accepts projected endpoint glyphs with direct constant properties', () => {
    const input = {
      type: 'relation',
      encodings: {
        source: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        target: { position: { x: { field: 'u' }, y: { field: 'v' } } },
      },
      properties: { endpoints: { source: { size: 3, fill: 'red' } }, geometry: { kind: 'path' } },
    };
    expect(MarkSchema.parse(input)).toMatchObject(input);
  });
});
