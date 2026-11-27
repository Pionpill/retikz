import { layer, LayerStack } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { pathScene } from '../_scene-workloads';

for (const count of [4, 16]) {
  const layers = Array.from({ length: count }, (_, i) => layer({ name: 'layer' + i, zIndex: i, scene: pathScene(4) }));
  const next = { ...layers[0], scene: pathScene(4, 'one') };
  const replacement = [next, ...layers.slice(1)];
  for (const operation of ['order', 'replace-layer', 'replace-stack']) {
    defineBenchmark({ id: operation + '/' + count, dimensions: ['层栈', operation, count + ' 层'] }, () => {
      let stack: LayerStack;
      let previous: LayerStack['current'];
      return {
        beforeEach: () => {
          stack = new LayerStack(layers);
          previous = stack.current;
        },
        run: () => {
          if (operation === 'order') stack.setLayerOrder(next.name, count);
          else if (operation === 'replace-layer') stack.replaceLayer(next);
          else stack.replace(replacement);
          return stack.current;
        },
        afterEach: () => stack.dispose(),
        verify: result => {
          expect(result).toHaveLength(count);
          if (operation === 'order') {
            expect(result.at(-1)?.name).toBe(next.name);
            expect(result.at(-1)?.result).toBe(previous[0].result);
          } else {
            expect(result[0].result).not.toBe(previous[0].result);
            if (operation === 'replace-layer') expect(result[1]).toBe(previous[1]);
          }
        },
      };
    });
  }
}
