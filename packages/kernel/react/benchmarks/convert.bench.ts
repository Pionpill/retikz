import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { convertReactToInputScene } from '../src';
import { longPath, mixedScene } from './_scenes';

for (const count of [64, 512, 4096]) {
  const reference = count === 4096;
  for (const grouping of ['flat', 'fragment', 'scope'] as const) {
    defineBenchmark(
      {
        id: `convert/${grouping}/leaves=${count}`,
        dimensions: ['JSX → InputScene', grouping, `${count} 图元`],
        workloadSize: count,
      },
      () => {
        const jsx = mixedScene(count, grouping);
        const types = ['coordinate', 'node', 'path'];
        const leaves = Array.from({ length: count }, (_, i) => ({ type: types[i % 3], id: `leaf-${i}` }));
        const expected =
          grouping === 'scope'
            ? Array.from({ length: count / 16 }, (_, i) => ({
                type: 'scope',
                id: `group-${i}`,
                children: leaves.slice(i * 16, (i + 1) * 16),
              }))
            : leaves;
        return {
          run: () => convertReactToInputScene(jsx),
          verify: result => expect(result).toMatchObject({ type: 'scene', children: expected }),
        };
      },
      reference,
    );
  }
  defineBenchmark(
    {
      id: `convert/path/steps=${count}`,
      dimensions: ['JSX → InputScene', '单条带标签路径', `${count} 步`],
      workloadSize: count,
    },
    () => {
      const jsx = longPath(count);
      const steps = Array.from({ length: count }, (_, i) => ({
        type: 'step',
        kind: i === 0 ? 'move' : 'line',
        to: [i, 0],
        ...(i % 8 === 7 ? { label: { text: `segment-${i}` } } : {}),
      }));
      return {
        run: () => convertReactToInputScene(jsx),
        verify: result => expect(result.children).toMatchObject([{ type: 'path', id: 'route', children: steps }]),
      };
    },
    reference,
  );
}
