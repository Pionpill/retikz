import { createLegend, LegendContentKind, LegendDefinition, LegendProvider } from '@retikz/standard';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputLegend } from '../src';

import { legend, LegendInputEmbedAdapter } from '../src';

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
} satisfies InputLegend;

describe('legend()', () => {
  it('creates a stable embed whose adapter lowers to canonical Legend IR', () => {
    const embed = legend('status', input);
    const normalized = normalizeScene(scene({ children: [embed] }), { adapters: [LegendInputEmbedAdapter] });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.legend', id: 'status' });
    expect(normalized.ir.children[0]).toEqual(createLegend(input));
    expect(normalized.ir.children[0]).toMatchObject({ contentAlign: 'end' });
    expect(normalized.contributions[0]).toEqual({ roots: [LegendProvider.key], providers: [LegendProvider] });
  });

  it('renders the same SVG as direct canonical IR in the same compile environment', () => {
    const embed = legend('status', input);
    const normalized = normalizeScene(scene({ children: [embed] }), { adapters: [LegendInputEmbedAdapter] });
    const direct = normalized.ir.children[0];
    const directOutput = renderToSvgString(
      { type: 'scene', version: 1, children: [direct] },
      { compile: { composites: [LegendDefinition] } },
    );
    const vanillaOutput = renderToSvgString(scene({ children: [embed] }), {
      adapters: [LegendInputEmbedAdapter],
      compile: { composites: [LegendDefinition] },
    });

    expect(LegendProvider.makeDefinition({})).toBe(LegendDefinition);
    expect(vanillaOutput).toBe(directOutput);
  });
});
