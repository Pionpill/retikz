import { DataFieldType } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import type { IRPlotPointNumberStyle } from '../../../src/schemas';

import { makeMarkValueResolver } from '../../../src/providers';

describe('makeMarkValueResolver', () => {
  it('resolves_constant_mark_value', () => {
    const value: IRPlotPointNumberStyle = { kind: 'constant', value: 3 };
    const resolver = makeMarkValueResolver<number>(value, new Map(), {
      channelName: 'weight',
      parse: raw => (typeof raw === 'number' ? raw : undefined),
    });

    expect(resolver?.field).toBeUndefined();
    expect(resolver?.resolver({ weight: 9 })).toBe(3);
  });

  it('resolves_field_mark_value_per_row', () => {
    const value: IRPlotPointNumberStyle = { kind: 'field', value: 'weight' };
    const resolver = makeMarkValueResolver<number>(value, new Map([['weight', DataFieldType.Continuous]]), {
      channelName: 'weight',
      expectedFieldType: DataFieldType.Continuous,
      parse: raw => (typeof raw === 'number' ? raw : undefined),
    });

    expect(resolver?.field).toBe('weight');
    expect(resolver?.fieldType).toBe(DataFieldType.Continuous);
    expect(resolver?.resolver({ weight: 9 })).toBe(9);
    expect(resolver?.resolver({ weight: 'bad' })).toBeUndefined();
  });

  it('rejects_unexpected_field_type', () => {
    const value: IRPlotPointNumberStyle = { kind: 'field', value: 'group' };

    expect(() =>
      makeMarkValueResolver<number>(value, new Map([['group', DataFieldType.Categorical]]), {
        channelName: 'weight',
        expectedFieldType: DataFieldType.Continuous,
        parse: raw => (typeof raw === 'number' ? raw : undefined),
      }),
    ).toThrow(/weight requires a continuous field/i);
  });
});
