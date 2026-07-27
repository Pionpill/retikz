import type { IRScene, LowerTex } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { renderToSvgString } from '../../src';

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
    },
  ],
  width: 10,
  height: 8,
  depth: 2,
});

const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      position: [0, 0],
      text: [{ runs: [{ tex: 'x', fill: 'royalblue' }] }],
    },
  ],
};

describe('Vanilla compile.lowerTex passthrough', () => {
  it('把 custom lowerer 的多条路径与 paint 交给同一 Core consumer', () => {
    const svg = renderToSvgString(scene, { compile: { lowerTex } });
    expect(svg).toContain('fill="royalblue"');
    expect(svg).toContain('fill="crimson"');
  });
});
