import { Layout, Node } from '@retikz/react';
import { createGrid, StandardAllPreset } from '@retikz/standard';
import { Axes, Frame, FrameTitle, Grid } from '@retikz/standard-react';
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
        </Layout>,
      ),
    ).not.toThrow();
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
