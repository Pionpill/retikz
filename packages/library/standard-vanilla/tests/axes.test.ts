import type { AxesInput } from '@retikz/standard';

import { AxesDefinition, AxesProvider, createAxes } from '@retikz/standard';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { axes, AxesInputEmbedAdapter, grid, GridInputEmbedAdapter } from '../src';

const input: AxesInput = {
  origin: { position: [100, 80], label: '0' },
  x: {
    extent: 40,
    grid: { spacing: 1, offset: 0.5, style: { dashPattern: [2, 1] } },
    line: { arrows: 'both', arrowDetail: { shape: 'openStealth', scale: 1.25 } },
    ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' } },
  },
  y: {
    extent: { negative: 20, positive: 40 },
    grid: { spacing: 1, offset: -0.5, style: { dashPattern: [2, 1] } },
    ticks: { source: { kind: 'values', values: [-20, 20, 40] } },
  },
};

describe('axes()', () => {
  it('keeps an authored root id distinct from the Vanilla embed id', () => {
    const embed = axes('host-occurrence', { ...input, id: 'authored-axes', meta: { source: 'vanilla' } });
    const contribution = AxesInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toMatchObject({ id: 'authored-axes', meta: { source: 'vanilla' } });
  });

  it('creates an embed that contributes canonical Axes IR', () => {
    const embed = axes('plane', input);
    const contribution = AxesInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.axes', id: 'plane' });
    expect(contribution.node).toEqual(createAxes(input));
    expect(contribution.providerDependencies).toEqual({ roots: [AxesProvider.key], providers: [AxesProvider] });
    expect(AxesProvider.makeDefinition({})).toBe(AxesDefinition);
  });

  it('coexists with Grid and contributes both definitions once', () => {
    const result = normalizeScene(
      scene({
        children: [
          grid('paper', { bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }),
          axes('plane', input),
        ],
      }),
      { adapters: [GridInputEmbedAdapter, AxesInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(2);
    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
  });
});
