import { createLegend, LegendContentKind, legendDefinition, legendProvider } from '@retikz/standard/presentation';
import { compileToScene, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputLegend } from '../src/presentation';
import { legend } from '../src/presentation';

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
    const normalized = normalizeScene(scene({ children: [embed] }));

    expect(embed).toMatchObject({ type: 'embed', adapter: { kind: 'standard.legend' }, id: 'authored-legend' });
    expect(normalized.ir.children[0]).toEqual(createLegend(input));
    expect(normalized.ir.children[0]).toMatchObject({ contentAlign: 'end' });
    expect(normalized.contributions[0]).toEqual({ roots: [legendProvider.key], providers: [legendProvider] });
  });

  it('在相同的编译环境中渲染与直接规范 IR 相同的 SVG', () => {
    const embed = legend(input);
    const normalized = normalizeScene(scene({ children: [embed] }));
    const direct = normalized.ir.children[0];
    const directOutput = renderToSvgString(
      compileToScene({ type: 'scene', version: 1, children: [direct] }, { compile: { composites: [legendDefinition] } })
        .scene,
    );
    const vanillaOutput = renderToSvgString(
      compileToScene(scene({ children: [embed] }), { compile: { composites: [legendDefinition] } }).scene,
    );

    expect(legendProvider.makeDefinition([])).toBe(legendDefinition);
    expect(vanillaOutput).toBe(directOutput);
  });
});
