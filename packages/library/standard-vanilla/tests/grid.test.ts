import { createGrid, GridDefinition, GridProvider } from '@retikz/standard';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { grid, GridInputEmbedAdapter } from '../src';

describe('grid()', () => {
  it('keeps an authored root id distinct from the Vanilla embed id', () => {
    const embed = grid('host-occurrence', {
      id: 'authored-grid',
      meta: { source: 'vanilla' },
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });
    const contribution = GridInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toMatchObject({ id: 'authored-grid', meta: { source: 'vanilla' } });
  });

  it('creates an embed whose adapter lowers to the same Standard Grid IR', () => {
    const embed = grid('paper', {
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });
    const contribution = GridInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.grid', id: 'paper' });
    expect(contribution.node).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(contribution.providerDependencies).toEqual({ roots: [GridProvider.key], providers: [GridProvider] });
    expect(GridProvider.makeDefinition({})).toBe(GridDefinition);
  });

  it('merges multiple Grid embeds through one stable definition maker', () => {
    const result = normalizeScene(
      scene({
        children: [
          grid('first', { bounds: { start: [0, 0], end: [20, 10] }, line: { spacing: 10 } }),
          grid('second', { bounds: { start: [30, 0], end: [50, 10] }, line: { spacing: 10 } }),
        ],
      }),
      { adapters: [GridInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(2);
  });

  it('accepts a center-form Cartesian position through the shared Grid input', () => {
    const input = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      line: { spacing: 10 },
    } as const;
    const embed = grid('center', input);
    const contribution = GridInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });

  it('accepts a PolarPosition center through the shared Grid input', () => {
    const input = {
      bounds: {
        position: { origin: [10, 5], angle: 90, radius: 20 },
        width: 20,
        height: 10,
      },
      line: { spacing: 10 },
    } as const;
    const embed = grid('polar', input);
    const contribution = GridInputEmbedAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });
});
