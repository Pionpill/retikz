import { Layout } from '@retikz/react';
import { createLegend, LayoutAlignment, LegendContentKind, LegendDefinition } from '@retikz/standard';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { LegendProps } from '../../src';

import { Legend } from '../../src';

const input = {
  title: { type: 'node', position: [0, 0], text: 'Status' },
  contentAlign: LayoutAlignment.End,
  content: {
    kind: LegendContentKind.Items,
    items: [
      {
        key: 'active',
        sample: { type: 'node', position: [0, 0], text: 'A' },
        label: { type: 'node', position: [0, 0], text: 'Active' },
      },
    ],
  },
} satisfies LegendProps;

describe('<Legend>', () => {
  it('contributes the canonical Legend IR without a React children path', () => {
    const contribution = Legend.embeddableAdapter.contribute(input);

    expect(contribution.node).toEqual(createLegend(input));
    expect(contribution.node).toMatchObject({ contentAlign: LayoutAlignment.End });
    expect(contribution.makeComposites({})).toEqual([LegendDefinition]);
    expectTypeOf<LegendProps>().not.toHaveProperty('children');
  });

  it('renders the same static output as direct canonical IR in the same compile environment', () => {
    const direct = createLegend(input);
    const contribution = Legend.embeddableAdapter.contribute(input);
    const directOutput = renderToStaticMarkup(
      <Layout
        ir={{ type: 'scene', version: 1, children: [direct] }}
        composites={[LegendDefinition]}
        width={200}
        height={120}
      />,
    );
    const reactOutput = renderToStaticMarkup(
      <Layout width={200} height={120}>
        <Legend {...input} />
      </Layout>,
    );

    expect(contribution.node).toEqual(direct);
    expect(contribution.makeComposites({})).toEqual([LegendDefinition]);
    expect(reactOutput).toBe(directOutput);
  });
});
