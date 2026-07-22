import { buildIRWithContributions } from '@retikz/react';
import { createAxes } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Axes, Grid } from '../../src';

const input = {
  bounds: { x: { min: -2, max: 2 }, y: { min: -1, max: 1 } },
  grid: { spacing: 1 },
  ticks: { x: 1, y: 1 },
} as const;

describe('<Axes>', () => {
  it('contributes canonical Axes IR through one stable local definition maker', () => {
    const first = Axes.embeddableAdapter?.contribute(input);
    const second = Axes.embeddableAdapter?.contribute(input);

    expect(first?.node).toEqual(createAxes(input));
    expect(first?.makeComposites).toBe(second?.makeComposites);
    expect(first?.makeComposites({})).toHaveLength(1);
  });

  it('coexists with Grid under distinct host contribution namespaces', () => {
    const result = buildIRWithContributions(
      <>
        <Grid bounds={{ min: [-2, -1], max: [2, 1] }} spacing={1} />
        <Axes {...input} />
      </>,
    );

    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
    expect(result.contributions.map(contribution => contribution.namespace)).toEqual([
      'standard.grid',
      'standard.axes',
    ]);
  });
});
