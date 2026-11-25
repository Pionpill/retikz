import { compileToScene, renderToSvg } from '@retikz/vanilla';
import { expect } from 'vitest';

import { sceneCases } from '../_mixed-workloads';
import { defineIntegrationBenchmark } from './_benchmark';
import { timeRender } from './_timer';

for (const spec of sceneCases) {
  const { label, size } = spec;
  defineIntegrationBenchmark(
    {
      workloadSize: Math.max(spec.nodes, spec.paths, spec.scopes),
      id: 'ssr/' + label + '/' + size,
      dimensions: ['全量编译（SSR 字符串）', label, size],
    },
    () => {
      const workload = spec.create();
      return {
        run: () => {
          const result = compileToScene(workload.ir);
          return { result, svg: timeRender(() => renderToSvg(result.scene)) };
        },
        verify: ({ result, svg }) => {
          workload.verify(result);
          expect(svg).toContain('<svg');
          if (label === '混合' && spec.scopes > 0) {
            expect(svg).toContain('<linearGradient');
            expect(svg).toContain('0.0');
          } else {
            expect(svg.match(/<rect\b/g) ?? []).toHaveLength(spec.nodes);
            expect(svg.match(/<path\b/g) ?? []).toHaveLength(spec.paths);
          }
        },
      };
    },
    false,
    600000,
  );
}
