import type { LegendInput } from '@retikz/standard';

import { createLegend, LegendContentKind, LegendDefinition, LegendProvider } from '@retikz/standard';
import { renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { legend, LegendVanillaAdapter } from '../src';

const input = {
  id: 'authored-legend',
  meta: { source: 'vanilla' },
  title: { type: 'node', position: [0, 0], text: 'Status' },
  contentAlign: 'end',
  content: {
    kind: LegendContentKind.Items,
    items: [
      {
        key: 'active',
        sample: { type: 'node', position: [0, 0], text: 'A' },
        label: { type: 'node', position: [0, 0], text: 'Active' },
      },
    ],
  },
} satisfies LegendInput;

describe('legend()', () => {
  it('creates a stable embed whose adapter lowers to canonical Legend IR', () => {
    const embed = legend('status', input);
    const contribution = LegendVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.legend', id: 'status' });
    expect(contribution.node).toEqual(createLegend(input));
    expect(contribution.node).toMatchObject({ contentAlign: 'end' });
    expect(contribution.compositeDependencies).toEqual({ roots: [LegendProvider.key], providers: [LegendProvider] });
  });

  it('renders the same SVG as direct canonical IR in the same compile environment', () => {
    const embed = legend('status', input);
    const contribution = LegendVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });
    const direct = createLegend(input);
    const directOutput = renderToSvgString(
      { type: 'scene', version: 1, children: [direct] },
      { compile: { composites: [LegendDefinition] } },
    );
    const vanillaOutput = renderToSvgString(
      { type: 'scene', version: 1, children: [contribution.node] },
      { compile: { composites: [LegendDefinition] } },
    );

    expect(contribution.node).toEqual(direct);
    expect(LegendProvider.makeDefinition({})).toBe(LegendDefinition);
    expect(vanillaOutput).toBe(directOutput);
  });
});
