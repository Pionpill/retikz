import { embed, normalizeScene, scene, node } from '@retikz/vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

const adapter: InputEmbedAdapter<number> = {
  kind: 'slot',
  lower(index, ctx) {
    const slot = ctx.normalizeChildren!([node({ id: 'n' + index, position: [0, 0], authoring: index })]);
    return {
      node: { type: 'scope', children: [...slot.children] },
      providerDependencies: slot.providerDependencies,
      authoringSites: slot.authoringSites,
      runtimeInputs: [{ path: [], input: { index } }],
    };
  },
};
for (const count of [8, 64]) {
  const input = scene(Array.from({ length: count }, (_, i) => embed({ adapter, props: i, id: 's' + i })));
  defineBenchmark({ id: 'slot/' + count, dimensions: ['归一化', '嵌入 slot', count + ' 项'] }, () => ({
    run: () => normalizeScene(input),
    verify: r => {
      expect(r.contributions).toHaveLength(count);
      expect(r.authoringSites).toHaveLength(count);
      expect(r.runtimeInputs?.at(-1)).toEqual({ path: ['children', count - 1], input: { index: count - 1 } });
      expect(r.ir.children.at(-1)).toMatchObject({ type: 'scope', children: [{ id: 'n' + (count - 1) }] });
    },
  }));
}
