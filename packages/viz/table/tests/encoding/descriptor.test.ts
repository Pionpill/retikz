import { describe, expect, expectTypeOf, it } from 'vitest';

import type { TableLegendDescriptor } from '../../src';

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

    expectTypeOf(swatch).toMatchTypeOf<TableLegendDescriptor>();
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
      'Table Legend descriptor color must not be empty or whitespace.',
    );
    expect(() =>
      TableLegendDescriptorSchema.parse({ ...threshold, form: 'ramp', domain: [0, 1], range: ['#fff', '#000'] }),
    ).toThrow();
  });
});
