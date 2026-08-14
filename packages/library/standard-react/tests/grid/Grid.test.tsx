import { createInputScene } from '@retikz/react';
import { createGrid, GridDefinition, GridProvider } from '@retikz/standard';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Grid } from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('<Grid>', () => {
  it('forwards authored root Scope identity and metadata unchanged', () => {
    const result = normalizeReactInput(
      <Grid
        id="authored-grid"
        meta={{ source: 'react' }}
        bounds={{ start: [0, 0], end: [20, 10] }}
        line={{ spacing: 10 }}
      />,
    );

    expect(result.ir.children[0]).toMatchObject({
      id: 'authored-grid',
      meta: { source: 'react' },
    });
  });

  it('contributes the same Standard Grid IR and a stable exact-key provider', () => {
    const first = normalizeReactInput(<Grid bounds={{ start: [0, 0], end: [20, 10] }} line={{ spacing: 10 }} />);
    const second = normalizeReactInput(<Grid bounds={{ start: [0, 0], end: [20, 10] }} line={{ spacing: 10 }} />);

    expect(first.ir.children[0]).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(first.contributions[0]).toEqual({ roots: [GridProvider.key], providers: [GridProvider] });
    expect(second.contributions[0]?.providers[0]).toBe(GridProvider);
    expect(GridProvider.makeDefinition({})).toBe(GridDefinition);
  });

  it('accepts a center-form Cartesian position through the shared Grid input', () => {
    const input = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      line: { spacing: 10 },
    } as const;

    expect(normalizeReactInput(<Grid {...input} />).ir.children[0]).toEqual(createGrid(input));
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

    expect(normalizeReactInput(<Grid {...input} />).ir.children[0]).toEqual(createGrid(input));
  });
});
