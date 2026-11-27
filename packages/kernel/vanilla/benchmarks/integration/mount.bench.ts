import { mountSceneView } from '@retikz/vanilla/dom';
import type { SceneView } from '@retikz/vanilla/dom';
import { expect } from 'vitest';

import { sceneCases } from '../_mixed-workloads';
import { defineIntegrationBenchmark } from './_benchmark';

for (const spec of sceneCases)
  for (const backend of ['svg', 'canvas'] as const)
    defineIntegrationBenchmark(
      {
        workloadSize: Math.max(spec.nodes, spec.paths, spec.scopes),
        id: ['mount', backend, spec.label, spec.size].join('/'),
        dimensions: ['增量编译（浏览器初始帧）', backend + ' / ' + spec.label, spec.size],
      },
      () => {
        const workload = spec.create();
        const container = document.body.appendChild(document.createElement('div'));
        const output = { width: 800 };
        let view: SceneView | undefined;
        const mount = () =>
          backend === 'svg'
            ? mountSceneView(container, workload.ir, output)
            : mountSceneView(container, workload.ir, {
                renderer: 'canvas',
                ...output,
                canvas: { devicePixelRatio: 1 },
              });
        return {
          beforeEach: () => view?.dispose(),
          run: () => {
            view = mount();
            return view;
          },
          verify: finished => {
            workload.verify(finished.compileResult);
            const root = finished.root;
            expect(root.parentElement).toBe(container);
            if (root instanceof SVGSVGElement) {
              if (spec.label === '混合' && spec.scopes > 0) {
                expect(root.querySelector('linearGradient')).not.toBeNull();
                expect(root.textContent).toContain('0.0');
              } else {
                expect(root.querySelectorAll('rect')).toHaveLength(spec.nodes);
                expect(root.querySelectorAll('path')).toHaveLength(spec.paths);
              }
            } else {
              const data = root.getContext('2d')!.getImageData(0, 0, root.width, root.height).data;
              expect(data.some((alpha, i) => i % 4 === 3 && alpha > 0)).toBe(true);
            }
          },
          dispose: () => {
            view?.dispose();
            container.remove();
          },
        };
      },
      false,
      600000,
    );
