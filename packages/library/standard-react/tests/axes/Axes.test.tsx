import type { AxesInput } from '@retikz/standard';

import { buildIRWithContributions } from '@retikz/react';
import { createAxes } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Axes, Grid } from '../../src';

const input: AxesInput = {
  origin: [100, 80],
  extent: { x: 40, y: { negative: 20, positive: 40 } },
  grid: { spacing: 1, offset: [0.5, -0.5], style: { dashPattern: [2, 1] } },
  x: {
    line: { arrows: 'both', arrowDetail: { shape: 'openStealth', scale: 1.25 } },
    ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' } },
  },
  y: { ticks: { source: { kind: 'values', values: [-20, 20, 40] } } },
};

describe('<Axes>', () => {
  it('contributes canonical Axes IR through one stable local definition maker', () => {
    const first = Axes.embeddableAdapter.contribute(input);
    const second = Axes.embeddableAdapter.contribute(input);

    expect(first.node).toEqual(createAxes(input));
    expect(first.makeComposites).toBe(second.makeComposites);
    expect(first.makeComposites({})).toHaveLength(1);
  });

  it('coexists with Grid under distinct host contribution namespaces', () => {
    const result = buildIRWithContributions(
      <>
        <Grid bounds={{ start: [-2, -1], end: [2, 1] }} spacing={1} />
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
