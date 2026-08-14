import { createInputScene, Node, Path, Step } from '@retikz/react';
import { AxesProvider, createFrame, FrameProvider, GridProvider } from '@retikz/standard';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { FrameProps } from '../../src';

import { Axes, Frame, FrameDescription, FrameTitle, Grid } from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

/** 以 React 真实 authoring 路径归一化一个 Frame */
const contribute = ({ children, ...props }: FrameProps) => {
  const normalized = normalizeReactInput(<Frame {...props}>{children}</Frame>);
  return {
    node: normalized.ir.children[0],
    providerDependencies: normalized.contributions[0],
  };
};

describe('<Frame>', () => {
  it('keeps root Scope fields separate from the nested border Path fields', () => {
    const result = normalizeReactInput(
      <Frame
        id="root"
        stroke="#0f172a"
        meta={{ source: 'react' }}
        border={{ style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 3 }}
      >
        <Node position={[0, 0]} />
      </Frame>,
    );

    expect(result.ir.children[0]).toMatchObject({
      id: 'root',
      stroke: '#0f172a',
      meta: { source: 'react' },
      border: { style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 3 },
    });
  });

  it('converts semantic header parts and body Nodes to canonical Frame IR', () => {
    const props = {
      id: 'definition-contract/frame',
      padding: 12,
      border: { cornerRadius: 6 },
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
    const first = contribute(props);
    const second = contribute(props);

    expect(first.node).toEqual(
      createFrame({
        id: 'definition-contract/frame',
        padding: 12,
        border: { cornerRadius: 6 },
        headerDirection: 'vertical',
        title: { text: 'Explicit title', font: { family: 'serif' } },
        description: { text: 'One registry contract.', maxTextWidth: 220 },
        children: [{ type: 'node', position: [0, 0], text: 'A' }],
      }),
    );
    expect(first.providerDependencies.providers[0]).toBe(FrameProvider);
    expect(second.providerDependencies.providers[0]).toBe(FrameProvider);
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
    const contribution = contribute({
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
      contribute({
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
      contribute({
        id: 'invalid/frame',
        children: (
          <Path>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[10, 0]} />
          </Path>
        ),
      }),
    ).toThrow(/only accepts direct Node children/i);

    expect(() => normalizeReactInput(<FrameTitle>Standalone</FrameTitle>)).toThrow(/direct child of Frame/i);
    expect(() => normalizeReactInput(<FrameDescription>Standalone</FrameDescription>)).toThrow(
      /direct child of Frame/i,
    );
  });

  it('rejects object-style title and description props at the React boundary', () => {
    const objectHeaderProps = {
      title: { text: 'Object title' },
      description: { text: 'Object description' },
    };

    expect(() =>
      contribute({
        id: 'invalid/frame',
        children: <Node position={[0, 0]} />,
        ...objectHeaderProps,
      }),
    ).toThrow(/FrameTitle.*FrameDescription/i);
  });

  it('coexists with Grid and Axes under distinct contribution namespaces', () => {
    const result = normalizeReactInput(
      <>
        <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
        <Axes x={{ extent: 20 }} y={{ extent: 20 }} />
        <Frame id="group/frame">
          <FrameTitle>Group</FrameTitle>
          <Node position={[0, 0]} text="A" />
        </Frame>
      </>,
    );

    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      GridProvider.key,
      AxesProvider.key,
      FrameProvider.key,
    ]);
    expect(result.ir.children[2]).toMatchObject({ id: 'group/frame' });
  });
});
