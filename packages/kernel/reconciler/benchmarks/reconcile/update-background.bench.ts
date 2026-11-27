import type { IRNode, IRScene } from '@retikz/core';
import { ReconcilerMode, SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { benchmarkCompileOptions, createBenchmarkNode, inspectBenchmarkScene } from './_execution';
import { createUpdateBenchmark } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';

for (const count of [100, 1000, 10000])
  for (const labels of [0, 8])
    for (const strategy of ['auto', 'full'] as const)
      defineBenchmark(
        {
          id: `reconciler/update/node/background-${labels}/${count}/${strategy}`,
          dimensions: ['增量更新', 'node', `固定单节点改色；背景每节点${labels}标签`, `${count}作者节点`, strategy],
        },
        () => {
          const nodes: Array<IRNode> = Array.from({ length: count }, (_, index) => ({
            ...createBenchmarkNode(index),
            id: `node-${index}`,
            ...(labels === 0
              ? {}
              : {
                  label: Array.from({ length: labels }, (unusedLabel, slot) => ({
                    text: `label-${slot}`,
                    position: 'top' as const,
                  })),
                }),
          }));
          const next: IRNode = { ...nodes[0], style: { ...nodes[0].style, fill: '#ef4444' } };
          const first: IRScene = { type: 'scene', version: 1, children: nodes };
          const workload = createUpdateWorkload(
            [first, { ...first, children: [next, ...nodes.slice(1)] }],
            root => [[updateChild(root, 0, next)], [updateChild(root, 0, nodes[0])]],
            1,
          );
          if (count !== 10000) return createUpdateBenchmark(workload, strategy);
          // 参考档只执行三次完整update；不另跑trace更新或同规模全量oracle
          const sourceBefore = JSON.stringify(workload.states);
          const session = new SceneReconciler(benchmarkCompileOptions, {
            mode: ReconcilerMode.Incremental,
            updateStrategy: strategy,
          });
          let result = session.mount(first);
          const batches = workload.batches(session.getScopeId(), path => session.getScopeId(path));
          const batchesBefore = JSON.stringify(batches);
          let direction = 1;
          let calls = 0;
          let selectedBatch = batches[0];
          const verify = () => {
            expect(result.revision).toBe(calls);
            expect(result.compilation.diagnostics).toEqual([]);
            expect(session.diagnostics()).toEqual([]);
            const { leaves, owners } = inspectBenchmarkScene(result.compilation.result);
            expect(leaves).toHaveLength(count * (1 + labels));
            const rectangles = leaves.filter(primitive => primitive.type === 'rect');
            expect(rectangles).toHaveLength(count);
            for (const [index, rectangle] of rectangles.entries()) {
              expect(owners.get(rectangle)).toBe(`node-${index}`);
              expect(rectangle.x + rectangle.width / 2).toBe((index % 20) * 500);
              expect(rectangle.y + rectangle.height / 2).toBe(Math.floor(index / 20) * 300);
              expect(rectangle.width).toBe(80);
              expect(rectangle.height).toBe(40);
              expect(rectangle.fill).toBe(index === 0 && direction === 0 ? '#ef4444' : '#ffffff');
            }
            const texts = leaves.filter(primitive => primitive.type === 'text');
            for (const [index, text] of texts.entries())
              expect(text.lines.map(line => line.text).join('')).toBe(`label-${index % labels}`);
            expect([
              ...(result.compilation.result.scene.resources?.paints ?? []),
              ...(result.compilation.result.scene.resources?.clips ?? []),
            ]).toEqual([]);
            expect(JSON.stringify(batches)).toBe(batchesBefore);
            expect(result.compilation.result.artifacts).toEqual([]);
            expect(JSON.stringify(workload.states)).toBe(sourceBefore);
          };
          return {
            observations: { elementsA: count, elementsB: count, changedElements: 1, mounts: 1 },
            beforeEach: () => {
              direction = 1 - direction;
              selectedBatch = batches[direction];
            },
            run: () => {
              calls++;
              return (result = session.update(selectedBatch));
            },
            afterEach: verify,
            verify,
            dispose: () => session.dispose(),
          };
        },
        count === 10000,
        600_000,
      );
