import { describe, expect, it } from 'vitest';

import type { MarkValueType } from '../../../src/schemas';

import { makeMarkValueResolver } from '../../../src/providers';
import { PlotFieldType } from '../../../src/schemas';

describe('makeMarkValueResolver', () => {
  it('resolves_constant_mark_value', () => {
    const value: MarkValueType<number> = { kind: 'constant', value: 3 };
    const resolver = makeMarkValueResolver<number>(value, new Map(), {
      channelName: 'weight',
      parse: raw => (typeof raw === 'number' ? raw : undefined),
    });

    expect(resolver?.field).toBeUndefined();
    expect(resolver?.resolver({ weight: 9 })).toBe(3);
  });

  it('resolves_field_mark_value_per_row', () => {
    const value: MarkValueType<number> = { kind: 'field', value: 'weight' };
    const resolver = makeMarkValueResolver<number>(value, new Map([['weight', PlotFieldType.Continuous]]), {
      channelName: 'weight',
      expectedFieldType: PlotFieldType.Continuous,
      parse: raw => (typeof raw === 'number' ? raw : undefined),
    });

    expect(resolver?.field).toBe('weight');
    expect(resolver?.fieldType).toBe(PlotFieldType.Continuous);
    expect(resolver?.resolver({ weight: 9 })).toBe(9);
    expect(resolver?.resolver({ weight: 'bad' })).toBeUndefined();
  });

  it('rejects_unexpected_field_type', () => {
    const value: MarkValueType<number> = { kind: 'field', value: 'group' };

    expect(() =>
      makeMarkValueResolver<number>(value, new Map([['group', PlotFieldType.Categorical]]), {
        channelName: 'weight',
        expectedFieldType: PlotFieldType.Continuous,
        parse: raw => (typeof raw === 'number' ? raw : undefined),
      }),
    ).toThrow(/weight requires a continuous field/i);
  });
});
