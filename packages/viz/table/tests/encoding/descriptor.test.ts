import { describe, expect, it } from 'vitest';

import { TableLegendDescriptorSchema } from '../../src';

describe('Table Legend descriptor schema', () => {
  it('accepts strict swatch and ramp descriptors as JSON-safe public output', () => {
    const swatch = TableLegendDescriptorSchema.parse({
      encodingId: 'status',
      channel: 'contentColor',
      scaleName: 'ordinal-color',
      title: 'Status',
      form: 'swatch',
      domain: ['ok', 'bad'],
      range: ['#0a0', '#a00'],
    });
    const ramp = TableLegendDescriptorSchema.parse({
      encodingId: 'score',
      channel: 'backgroundFill',
      scaleName: 'sequential-color',
      form: 'ramp',
      domain: [0, 10],
      range: ['#fff', '#000'],
    });

    expect(JSON.parse(JSON.stringify([swatch, ramp]))).toEqual([swatch, ramp]);
    expect(() => TableLegendDescriptorSchema.parse({ ...swatch, placement: 'right' })).toThrow();
  });

  it('enforces form-specific domain, range, edge, scalar, and color contracts', () => {
    const threshold = {
      encodingId: 'risk',
      channel: 'backgroundFill',
      scaleName: 'threshold-color',
      form: 'swatch',
      domain: [10, 20],
      range: ['green', 'orange', 'red'],
      edges: [10, 20],
    } as const;

    expect(TableLegendDescriptorSchema.parse(threshold)).toEqual(threshold);
    expect(() => TableLegendDescriptorSchema.parse({ ...threshold, range: ['green', 'red'] })).toThrow();
    expect(() => TableLegendDescriptorSchema.parse({ ...threshold, edges: [20, 10] })).toThrow();
    expect(() => TableLegendDescriptorSchema.parse({ ...threshold, domain: [{ invalid: true }, 20] })).toThrow();
    expect(() => TableLegendDescriptorSchema.parse({ ...threshold, range: ['green', ' ', 'red'] })).toThrow(
      'String must contain at least one non-whitespace character.',
    );
    expect(() =>
      TableLegendDescriptorSchema.parse({ ...threshold, form: 'ramp', domain: [0, 1], range: ['#fff', '#000'] }),
    ).toThrow();
  });

  it('requires exactly two ramp endpoints while preserving omitted threshold edges', () => {
    const ramp = {
      encodingId: 'score',
      channel: 'backgroundFill',
      scaleName: 'sequential-color',
      form: 'ramp',
      domain: [0, 1],
      range: ['white', 'black'],
    };
    expect(TableLegendDescriptorSchema.parse(ramp)).toEqual(ramp);
    expect(TableLegendDescriptorSchema.parse({ ...ramp, edges: undefined })).toEqual({ ...ramp, edges: undefined });
    for (const domain of [[], [0], [0, 1, 2]]) {
      expect(TableLegendDescriptorSchema.safeParse({ ...ramp, domain }).success).toBe(false);
    }
    for (const range of [[], ['white'], ['white', 'gray', 'black']]) {
      expect(TableLegendDescriptorSchema.safeParse({ ...ramp, range }).success).toBe(false);
    }
  });
});
