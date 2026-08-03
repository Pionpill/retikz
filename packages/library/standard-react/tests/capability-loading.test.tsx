import { Layout, Node } from '@retikz/react';
import { createGrid, GridDefinition, LegendContentKind, LegendDefinition, StandardAllPreset } from '@retikz/standard';
import { Axes, FlexLayout, Frame, FrameTitle, Grid, LayoutItem, Legend, LegendItem } from '@retikz/standard-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('Standard React capability loading', () => {
  it('keeps JSX components self-registering through their static adapters', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80}>
          <Grid bounds={{ min: [0, 0], max: [20, 20] }} spacing={10} />
          <Axes extent={{ x: 20, y: 20 }} />
          <Frame id="contract">
            <FrameTitle text="Contract" />
            <Node position={[0, 0]} text="Body" />
          </Frame>
          <FlexLayout>
            <LayoutItem kind="flex" itemKey="layout-node">
              <Node position={[30, 30]} text="Layout" />
            </LayoutItem>
          </FlexLayout>
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
        <LegendItem itemKey="grid" sample={<Grid bounds={{ min: [0, 0], max: [20, 20] }} spacing={10} />} />
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
            <LegendItem itemKey="grid" sample={<Grid bounds={{ min: [0, 0], max: [20, 20] }} spacing={10} />} />
          ),
        })
        .makeComposites({}),
    ).toEqual([LegendDefinition]);
  });

  it('compiles direct Standard IR with an explicit bundle', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { min: [0, 0], max: [20, 20] }, spacing: 10 })],
    };

    const svg = renderToStaticMarkup(
      <Layout ir={ir} composites={StandardAllPreset.compile.composites} width={120} height={80} />,
    );

    expect(svg).toContain('<path');
  });

  it('leaves duplicate JSX and explicit bundle registration fail-loud', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={StandardAllPreset.compile.composites} width={120} height={80}>
          <Grid bounds={{ min: [0, 0], max: [20, 20] }} spacing={10} />
        </Layout>,
      ),
    ).toThrow(/duplicate composite registration.*standard\.grid/i);
  });
});
