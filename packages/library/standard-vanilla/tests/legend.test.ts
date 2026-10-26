import { createLegend, LegendContentKind, LegendDefinition, LegendProvider } from '@retikz/standard/presentation';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputLegend } from '../src/presentation';
import { legend, LegendInputEmbedAdapter } from '../src/presentation';

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

describe('图例（）', () => {
  it('创建一个稳定的嵌入，其适配器下沉到规范的 Legend IR', () => {
    const embed = legend(input);
    const normalized = normalizeScene(scene({ children: [embed] }), { adapters: [LegendInputEmbedAdapter] });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.legend', id: 'authored-legend' });
    expect(normalized.ir.children[0]).toEqual(createLegend(input));
    expect(normalized.ir.children[0]).toMatchObject({ contentAlign: 'end' });
    expect(normalized.contributions[0]).toEqual({ roots: [LegendProvider.key], providers: [LegendProvider] });
  });

  it('在相同的编译环境中渲染与直接规范 IR 相同的 SVG', () => {
    const embed = legend(input);
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

    expect(LegendProvider.makeDefinition([])).toBe(LegendDefinition);
    expect(vanillaOutput).toBe(directOutput);
  });
});
