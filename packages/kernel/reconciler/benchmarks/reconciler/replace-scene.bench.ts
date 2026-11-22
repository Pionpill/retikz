import type { IRScene } from '@retikz/core';
import { ReconcilerMode, SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { benchmarkCompileOptions, createBenchmarkNode } from './_execution';
import { compileBenchmarkSnapshot, verifyBenchmarkSnapshot } from './_snapshot';

for (const count of [100, 1000])
  for (const mode of [ReconcilerMode.Full, ReconcilerMode.Incremental])
    for (const change of ['same', 'equal', 'position'] as const)
      defineBenchmark(
        {
          id: `reconciler/replace/scene/${change}/${count}/${mode}`,
          dimensions: ['完整替换', 'scene', change, `${count} 作者节点`, mode],
        },
        () => {
          const nodes = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
          const first: IRScene = { type: 'scene', version: 1, children: nodes };
          const second: IRScene =
            change === 'position'
              ? {
                  ...first,
                  children: nodes.map((node, index) => (index === 0 ? { ...node, position: [10, 20] } : node)),
                }
              : first;
          const states = [first, second];
          const before = JSON.stringify(states);
          const expected = states.map(scene => compileBenchmarkSnapshot(scene, benchmarkCompileOptions));
          const session = new SceneReconciler(benchmarkCompileOptions, { mode });
          let result = session.mount(first);
          let source = first;
          let direction = 0;
          let calls = 0;
          const verify = () => {
            verifyBenchmarkSnapshot(result.compilation, expected[direction], session.diagnostics());
            expect(result.revision).toBe(calls);
            expect(JSON.stringify(states)).toBe(before);
          };
          return {
            beforeEach: () => {
              direction = 1 - direction;
              source = change === 'equal' ? structuredClone(states[direction]) : states[direction];
            },
            run: () => {
              calls++;
              return (result = session.replace(source));
            },
            afterEach: () => {
              if (calls <= 2 || calls >= 109) verify();
            },
            verify,
            dispose: () => session.dispose(),
          };
        },
        false,
        600_000,
      );
