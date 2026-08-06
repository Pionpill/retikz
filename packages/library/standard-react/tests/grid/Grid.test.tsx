import { createGrid } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Grid } from '../../src';

describe('<Grid>', () => {
  it('forwards authored root Scope identity and metadata unchanged', () => {
    const input: Parameters<typeof Grid.embeddableAdapter.contribute>[0] = {
      id: 'authored-grid',
      meta: { source: 'react' },
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    };

    expect(Grid.embeddableAdapter.contribute(input).node).toMatchObject({
      id: 'authored-grid',
      meta: { source: 'react' },
    });
  });

  it('contributes the same Standard Grid IR and a stable local definition maker', () => {
    const first = Grid.embeddableAdapter.contribute({
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });
    const second = Grid.embeddableAdapter.contribute({
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });

    expect(first.node).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(first.makeComposites).toBe(second.makeComposites);
    expect(first.makeComposites({})).toHaveLength(1);
  });

  it('accepts a center-form Cartesian position through the shared Grid input', () => {
    const input = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      line: { spacing: 10 },
    } as const;

    expect(Grid.embeddableAdapter.contribute(input).node).toEqual(createGrid(input));
  });

  it('accepts a PolarPosition center through the shared Grid input', () => {
    const input = {
      bounds: {
        position: { origin: [10, 5], angle: 90, radius: 20 },
        width: 20,
        height: 10,
      },
      line: { spacing: 10 },
    } as const;

    expect(Grid.embeddableAdapter.contribute(input).node).toEqual(createGrid(input));
  });
});
