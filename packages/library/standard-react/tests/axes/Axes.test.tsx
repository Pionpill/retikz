import type { AxesInput } from '@retikz/standard';

import { createInputScene } from '@retikz/react';
import { AxesDefinition, AxesProvider, createAxes, GridProvider } from '@retikz/standard';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Axes, Grid } from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

const input: AxesInput = {
  origin: { position: [100, 80], label: '0' },
  x: {
    extent: 40,
    grid: { spacing: 1, offset: 0.5, style: { dashPattern: [2, 1] } },
    line: { arrows: 'both', arrowDetail: { shape: 'openStealth', scale: 1.25 } },
    ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' } },
  },
  y: {
    extent: { negative: 20, positive: 40 },
    grid: { spacing: 1, offset: -0.5, style: { dashPattern: [2, 1] } },
    ticks: { source: { kind: 'values', values: [-20, 20, 40] } },
  },
};

describe('<Axes>', () => {
  it('forwards authored root Scope identity instead of deriving it from React host state', () => {
    const result = normalizeReactInput(
      <Axes {...input} id="authored-axes" localNamespace meta={{ source: 'react' }} />,
    );

    expect(result.ir.children[0]).toMatchObject({
      id: 'authored-axes',
      localNamespace: true,
      meta: { source: 'react' },
    });
  });

  it('contributes canonical Axes IR through one stable exact-key provider', () => {
    const first = normalizeReactInput(<Axes {...input} />);
    const second = normalizeReactInput(<Axes {...input} />);

    expect(first.ir.children[0]).toEqual(createAxes(input));
    expect(first.contributions[0]).toEqual({ roots: [AxesProvider.key], providers: [AxesProvider] });
    expect(second.contributions[0]?.providers[0]).toBe(AxesProvider);
    expect(AxesProvider.makeDefinition({})).toBe(AxesDefinition);
  });

  it('coexists with Grid under distinct qualified provider keys', () => {
    const result = normalizeReactInput(
      <>
        <Grid bounds={{ start: [-2, -1], end: [2, 1] }} line={{ spacing: 1 }} />
        <Axes {...input} />
      </>,
    );

    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      GridProvider.key,
      AxesProvider.key,
    ]);
  });
});
