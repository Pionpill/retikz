import { createInputScene, Layout, Node } from '@retikz/react';
import { createGrid, GridDefinition, GridProvider, LegendContentKind, LegendProvider } from '@retikz/standard';
import { Axes, Frame, FrameTitle, Grid, Legend, LegendItem } from '@retikz/standard-react';
import { normalizeScene } from '@retikz/vanilla';
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

  it('forwards nested Tier 2 capability loading through the Legend Vanilla adapter', () => {
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
    ).not.toThrow();
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={[GridDefinition]} width={120} height={80}>
          {legend}
        </Layout>,
      ),
    ).not.toThrow();
    const input = createInputScene(legend);
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });
    expect(normalized.contributions[0]).toEqual({
      roots: [LegendProvider.key, GridProvider.key],
      providers: [LegendProvider, GridProvider],
    });
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

  it('deduplicates the same explicit definition object and rejects a different object at the same key', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={[GridDefinition]} width={120} height={80}>
          <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
        </Layout>,
      ),
    ).not.toThrow();
    expect(() =>
      renderToStaticMarkup(
        <Layout composites={[{ ...GridDefinition }]} width={120} height={80}>
          <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
        </Layout>,
      ),
    ).toThrow(/definition conflict.*standard\.grid/i);
  });
});
