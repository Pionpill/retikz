import { describe, expect, it } from 'vitest';

import { Grid } from '../../src';

describe('<Grid>', () => {
  it('contributes the same Standard Grid IR and a stable local definition maker', () => {
    const first = Grid.embeddableAdapter.contribute({
      bounds: { min: [0, 0], max: [20, 10] },
      spacing: 10,
    });
    const second = Grid.embeddableAdapter.contribute({
      bounds: { min: [0, 0], max: [20, 10] },
      spacing: 10,
    });

    expect(first.node).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(first.makeComposites).toBe(second.makeComposites);
    expect(first.makeComposites({})).toHaveLength(1);
  });
});
