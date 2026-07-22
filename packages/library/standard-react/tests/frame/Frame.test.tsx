import { buildIRWithContributions, Node, Path, Step } from '@retikz/react';
import { createFrame } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Axes, Frame, Grid } from '../../src';

describe('<Frame>', () => {
  it('converts React Node children to canonical Frame IR through a stable maker', () => {
    const props = {
      id: 'definition-contract/frame',
      label: 'Contract',
      children: <Node position={[0, 0]} text="A" />,
    };
    const first = Frame.embeddableAdapter?.contribute(props);
    const second = Frame.embeddableAdapter?.contribute(props);

    expect(first?.node).toEqual(
      createFrame({
        id: 'definition-contract/frame',
        label: 'Contract',
        children: [{ type: 'node', position: [0, 0], text: 'A' }],
      }),
    );
    expect(first?.makeComposites).toBe(second?.makeComposites);
  });

  it('fails loudly when a direct React child does not become a Core Node', () => {
    expect(() =>
      Frame.embeddableAdapter?.contribute({
        id: 'invalid/frame',
        children: (
          <Path>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[10, 0]} />
          </Path>
        ),
      }),
    ).toThrow(/only accepts direct Node children/i);
  });

  it('coexists with Grid and Axes under distinct contribution namespaces', () => {
    const result = buildIRWithContributions(
      <>
        <Grid bounds={{ min: [0, 0], max: [20, 20] }} spacing={10} />
        <Axes bounds={{ x: { min: -1, max: 1 }, y: { min: -1, max: 1 } }} />
        <Frame id="group/frame">
          <Node position={[0, 0]} text="A" />
        </Frame>
      </>,
    );

    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(result.contributions.map(contribution => contribution.namespace)).toEqual([
      'standard.grid',
      'standard.axes',
      'standard.frame',
    ]);
  });
});
