import type { LowerTex } from '@retikz/core';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Layout, Node } from '../../../src';

const lowerTex: LowerTex = () => ({
  paths: [
    {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      fill: { kind: 'currentColor' },
      stroke: { kind: 'none' },
    },
    {
      commands: [
        { kind: 'move', to: [0, 1] },
        { kind: 'line', to: [10, 1] },
      ],
      fill: { kind: 'color', value: 'crimson' },
      stroke: { kind: 'none' },
      opacity: 0.5,
    },
  ],
  width: 10,
  height: 8,
  depth: 2,
});

describe('<Layout lowerTex> multi-path passthrough', () => {
  it('把 custom lowerer 的多条路径与 paint 交给同一 Core consumer', () => {
    const svg = renderToStaticMarkup(
      <Layout lowerTex={lowerTex}>
        <Node position={[0, 0]} text={[{ runs: [{ tex: 'x', fill: 'royalblue' }] }]} />
      </Layout>,
    );

    expect(svg).toContain('fill="royalblue"');
    expect(svg).toContain('fill="crimson"');
    expect(svg).toContain('opacity="0.5"');
  });
});
