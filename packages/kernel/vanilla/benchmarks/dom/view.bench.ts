import { defineRenderer } from '@retikz/render/runtime';
import type {
  RendererFactory,
  InputRendererFactory,
  SceneRuntimeSnapshot,
  RenderRuntimeConfig,
} from '@retikz/render/runtime';
import { mountSceneView } from '@retikz/vanilla/dom';
import type { SceneView } from '@retikz/vanilla/dom';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { pathScene } from '../_scene-workloads';

/** 只接收已提交帧，不执行 SVG 或 Canvas 绘制 */
const recordingFactory = (observe: (config: RenderRuntimeConfig) => void): RendererFactory =>
  ((input: InputRendererFactory) => {
    let snapshot: SceneRuntimeSnapshot;
    const prepare = (next: SceneRuntimeSnapshot, config: RenderRuntimeConfig) => {
      const previous = snapshot;
      return {
        commit: () => {
          snapshot = next;
          observe(config);
        },
        rollback: () => {
          snapshot = previous;
        },
        dispose: () => {},
      };
    };
    const renderer = {
      capability: 'none' as const,
      prepareMount: prepare,
      prepare: (_: unknown, next: SceneRuntimeSnapshot, config: RenderRuntimeConfig) => prepare(next, config),
      read: () => ({ snapshot }),
      dispose: () => {},
    };
    return input.backend === 'svg'
      ? defineRenderer({ ...renderer, backend: 'svg', host: input.host })
      : defineRenderer({ ...renderer, backend: 'canvas', host: input.host });
  }) as RendererFactory;
for (const operation of ['mount', 'hydrate', 'unbind', 'dispose']) {
  const initial = pathScene(1);
  defineBenchmark({ id: operation, dimensions: ['视图', operation, '1 路径'] }, () => {
    const container = document.createElement('div');
    let view: SceneView | undefined;
    let registration: ReturnType<SceneView['hydrate']>;
    let handlers = 0;
    const rendererFactory = recordingFactory(config => {
      handlers = config.handlerContributions?.length ?? 0;
    });
    const mount = () => mountSceneView(container, initial, { rendererFactory });
    return {
      beforeEach: () => {
        view?.dispose();
        view = operation === 'mount' ? undefined : mount();
        if (operation === 'unbind') registration = view!.hydrate({ handlers: {} });
      },
      run: () => {
        switch (operation) {
          case 'mount':
            view = mount();
            break;
          case 'hydrate':
            registration = view!.hydrate({ handlers: {} });
            break;
          case 'unbind':
            registration.dispose();
            break;
          case 'dispose':
            view!.dispose();
            break;
        }
        return view!.root;
      },
      verify: root => {
        expect(handlers).toBe(operation === 'hydrate' ? 1 : 0);
        expect(container.contains(root)).toBe(operation !== 'dispose');
        expect(root.getAttribute('width')).toBe('256');
      },
      dispose: () => view?.dispose(),
    };
  });
}
