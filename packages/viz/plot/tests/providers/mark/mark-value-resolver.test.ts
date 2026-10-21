import { DataFieldType } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { makeMarkValueResolver } from '../../../src/providers';
import type { IRPlotChannel } from '../../../src/schemas';

describe('makeMarkValueResolver', () => {
  it('does not create a field resolver when no encoding is declared', () => {
    expect(makeMarkValueResolver(undefined, [], { channelName: 'weight', parse: value => value })).toBeUndefined();
  });

  it('resolves_field_mark_value_per_row', () => {
    const value: IRPlotChannel = 'weight';
    const resolver = makeMarkValueResolver<number>(value, [{ name: 'weight', type: DataFieldType.Continuous }], {
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
    const value: IRPlotChannel = 'group';

    expect(() =>
      makeMarkValueResolver<number>(value, [{ name: 'group', type: DataFieldType.Categorical }], {
        channelName: 'weight',
        expectedFieldType: DataFieldType.Continuous,
        parse: raw => (typeof raw === 'number' ? raw : undefined),
      }),
    ).toThrow(/weight requires a continuous field/i);
  });
});
