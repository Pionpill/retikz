import { Layout, Node } from '@retikz/react';
import { createGrid, GridDefinition, LegendContentKind, LegendDefinition } from '@retikz/standard';
import { Axes, Frame, FrameTitle, Grid, Legend, LegendItem } from '@retikz/standard-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('Standard React definition loading', () => {
  it('keeps JSX components self-registering through their static adapters', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80}>
          <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
          <Axes x={{ extent: 20 }} y={{ extent: 20 }} />
          <Frame id="contract">
            <FrameTitle text="Contract" />
            <Node position={[0, 0]} text="Body" />
          </Frame>
          <Legend kind={LegendContentKind.Items}>
            <LegendItem itemKey="node" sample={<Node position={[0, 0]} text="N" />} />
          </Legend>
        </Layout>,
      ),
    ).not.toThrow();
  });

  it('keeps nested Tier 2 capability loading explicit at the Legend boundary', () => {
    const legend = (
      <Legend kind={LegendContentKind.Items}>
        <LegendItem itemKey="grid" sample={<Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />} />
      </Legend>
    );

    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80}>
          {legend}
        </Layout>,
      ),
    ).toThrow(/standard\.grid/i);
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={[GridDefinition]} width={120} height={80}>
          {legend}
        </Layout>,
      ),
    ).not.toThrow();
    expect(
      Legend.embeddableAdapter
        .contribute({
          kind: LegendContentKind.Items,
          children: (
            <LegendItem
              itemKey="grid"
              sample={<Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />}
            />
          ),
        })
        .makeComposites({}),
    ).toEqual([LegendDefinition]);
  });

  it('compiles direct Standard IR with explicit definitions', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })],
    };

    const svg = renderToStaticMarkup(<Layout ir={ir} composites={[GridDefinition]} width={120} height={80} />);

    expect(svg).toContain('<path');
  });

  it('leaves duplicate JSX and explicit definition registration fail-loud', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={[GridDefinition]} width={120} height={80}>
          <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
        </Layout>,
      ),
    ).toThrow(/duplicate composite registration.*standard\.grid/i);
  });
});
