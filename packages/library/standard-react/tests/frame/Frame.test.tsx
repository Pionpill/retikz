import { buildIRWithContributions, convertReactNodeToIR, Node, Path, Step } from '@retikz/react';
import { createFrame } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Axes, Frame, FrameDescription, FrameTitle, Grid } from '../../src';

describe('<Frame>', () => {
  it('converts semantic header parts and body Nodes to canonical Frame IR', () => {
    const props = {
      id: 'definition-contract/frame',
      padding: 12,
      cornerRadius: 6,
      headerDirection: 'vertical' as const,
      children: (
        <>
          <FrameTitle text="Explicit title" font={{ family: 'serif' }}>
            Ignored title
          </FrameTitle>
          <FrameDescription maxTextWidth={220}>One registry contract.</FrameDescription>
          <Node position={[0, 0]} text="A" />
        </>
      ),
    };
    const first = Frame.embeddableAdapter.contribute(props);
    const second = Frame.embeddableAdapter.contribute(props);

    expect(first.node).toEqual(
      createFrame({
        id: 'definition-contract/frame',
        padding: 12,
        cornerRadius: 6,
        headerDirection: 'vertical',
        title: { text: 'Explicit title', font: { family: 'serif' } },
        description: { text: 'One registry contract.', maxTextWidth: 220 },
        children: [{ type: 'node', position: [0, 0], text: 'A' }],
      }),
    );
    expect(first.makeComposites).toBe(second.makeComposites);
  });

  it('preserves JSON-safe Node fields on FrameTitle and FrameDescription', () => {
    const animations = [
      {
        property: 'opacity',
        duration: 200,
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
      },
    ];
    const contribution = Frame.embeddableAdapter.contribute({
      id: 'styled/frame',
      children: (
        <>
          <FrameTitle
            id="heading"
            shape="circle"
            fill="#fff"
            padding={3}
            label={{ text: 'stable', position: 'right' }}
            meta={{ role: 'title' }}
            animations={animations}
          >
            Contract
          </FrameTitle>
          <Node position={[0, 0]} />
        </>
      ),
    });

    expect(contribution.node).toMatchObject({
      title: {
        id: 'heading',
        text: 'Contract',
        shape: 'circle',
        fill: '#fff',
        padding: 3,
        label: { text: 'stable', position: 'right' },
        meta: { role: 'title' },
        animations,
      },
    });
  });

  it('fails loudly for duplicate parts, unsupported body children, and standalone parts', () => {
    expect(() =>
      Frame.embeddableAdapter.contribute({
        id: 'duplicate/frame',
        children: (
          <>
            <FrameTitle>First</FrameTitle>
            <FrameTitle>Second</FrameTitle>
            <Node position={[0, 0]} />
          </>
        ),
      }),
    ).toThrow(/one FrameTitle/i);

    expect(() =>
      Frame.embeddableAdapter.contribute({
        id: 'invalid/frame',
        children: (
          <Path>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[10, 0]} />
          </Path>
        ),
      }),
    ).toThrow(/only accepts direct Node children/i);

    expect(() => convertReactNodeToIR(<FrameTitle>Standalone</FrameTitle>)).toThrow(/direct child of Frame/i);
    expect(() => convertReactNodeToIR(<FrameDescription>Standalone</FrameDescription>)).toThrow(
      /direct child of Frame/i,
    );
  });

  it('rejects object-style title and description props at the React boundary', () => {
    const objectHeaderProps = {
      title: { text: 'Object title' },
      description: { text: 'Object description' },
    };

    expect(() =>
      Frame.embeddableAdapter.contribute({
        id: 'invalid/frame',
        children: <Node position={[0, 0]} />,
        ...objectHeaderProps,
      }),
    ).toThrow(/FrameTitle.*FrameDescription/i);
  });

  it('coexists with Grid and Axes under distinct contribution namespaces', () => {
    const result = buildIRWithContributions(
      <>
        <Grid bounds={{ start: [0, 0], end: [20, 20] }} spacing={10} />
        <Axes extent={{ x: 20, y: 20 }} />
        <Frame id="group/frame">
          <FrameTitle>Group</FrameTitle>
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
