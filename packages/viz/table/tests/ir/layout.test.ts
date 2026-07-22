import { describe, expect, it } from 'vitest';

import { TableLayoutSchema } from '../../src';

describe('Table layout schema', () => {
  it('round-trips fixed track sizes and gaps without materializing defaults', () => {
    const layout = {
      columnWidth: 100,
      rowHeight: 28,
      headerHeight: 36,
      columnGap: 4,
      rowGap: 2,
    };

    expect(TableLayoutSchema.parse(JSON.parse(JSON.stringify(layout)))).toEqual(layout);
    expect(TableLayoutSchema.parse({})).toEqual({});
  });

  it.each([
    ['columnWidth', 0],
    ['columnWidth', -1],
    ['columnWidth', Number.NaN],
    ['columnWidth', Number.POSITIVE_INFINITY],
    ['rowHeight', 0],
    ['headerHeight', -1],
    ['columnGap', -1],
    ['rowGap', Number.NaN],
  ])('rejects invalid %s=%s', (field, value) => {
    expect(() => TableLayoutSchema.parse({ [field]: value })).toThrow();
  });

  it('accepts extremely small positive tracks and zero gaps', () => {
    const layout = { columnWidth: Number.MIN_VALUE, rowHeight: Number.MIN_VALUE, columnGap: 0, rowGap: 0 };

    expect(TableLayoutSchema.parse(layout)).toEqual(layout);
  });
});
