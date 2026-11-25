import type { IRScene, IRNode } from '@retikz/core';
import type { WeaveBatch } from '@retikz/reconciler';
import { builtinRendererFactory, createRenderTarget } from '@retikz/render/runtime';
import { SceneRuntime } from '@retikz/vanilla';
import { expect } from 'vitest';

import { connectedWorkload } from '../_mixed-workloads';
import { defineIntegrationBenchmark } from './_benchmark';

/** 接入真实后端并同步提交增量计算的结果 */
const attach = (ir: IRScene, backend: 'svg' | 'canvas') => {
  const renderer =
    backend === 'svg'
      ? ({
          backend,
          host: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
          immutableOptions: { backend, idPrefix: 'chain' },
        } as const)
      : ({
          backend,
          host: document.createElement('canvas'),
          immutableOptions: { backend, idPrefix: 'chain', devicePixelRatio: 1 },
        } as const);
  const runtime = new SceneRuntime(ir, {
    reconciler: { mode: 'incremental' },
    createTarget: () =>
      createRenderTarget({
        ...renderer,
        rendererFactory: builtinRendererFactory,
        configuration: () => ({ animation: { enabled: false } }),
      }).target,
  });
  document.body.appendChild(renderer.host);
  return {
    runtime,
    root: renderer.host,
    dispose: () => {
      runtime.dispose();
      renderer.host.remove();
    },
  };
};

/** 仅在计时外比较实际 SVG 图形几何或 Canvas 全部像素 */
const picture = (root: SVGSVGElement | HTMLCanvasElement) => {
  if (root instanceof SVGSVGElement)
    return Array.from(root.querySelectorAll('rect,path'), element => element.outerHTML).join('');
  const pixels = root.getContext('2d')!.getImageData(0, 0, root.width, root.height);
  return pixels.data;
};
const samePicture = (left: ReturnType<typeof picture>, right: ReturnType<typeof picture>) =>
  typeof left === 'string'
    ? left === right
    : typeof right !== 'string' && left.length === right.length && left.every((value, i) => value === right[i]);

for (const count of [100, 1000])
  for (const backend of ['svg', 'canvas'] as const) {
    defineIntegrationBenchmark(
      {
        id: ['update', backend, count + ' Node + ' + (count - 1) + ' Path'].join('/'),
        dimensions: [
          '增量更新（batch）',
          backend + ' / update / 移动中间节点',
          count + ' Node + ' + (count - 1) + ' Path',
        ],
      },
      () => {
        const { ir, nodes, paths } = connectedWorkload(count, 'chain');
        const index = Math.floor(count / 2);
        const original = nodes[index];
        const moved: IRNode = { ...original, position: [20 + (index % 25) * 28, 27 + Math.floor(index / 25) * 18] };
        const next = { ...ir, children: [...nodes.slice(0, index), moved, ...nodes.slice(index + 1), ...paths] };
        const reference = attach(next, backend);
        const expected = picture(reference.root);
        reference.dispose();
        const host = attach(ir, backend);
        const { runtime } = host;
        expect(samePicture(picture(host.root), expected)).toBe(false);
        const target = { kind: 'id' as const, id: original.id!, scopeId: runtime.getScopeId([], runtime.current) };
        const forward: WeaveBatch = { operations: [{ kind: 'update', target, input: moved }] };
        const reverse: WeaveBatch = { operations: [{ kind: 'update', target, input: original }] };
        let changed = false;
        return {
          beforeEach: () => {
            if (changed) runtime.update(reverse);
          },
          run: () => {
            runtime.update(forward);
            changed = true;
            return host.root;
          },
          verify: root => expect(samePicture(picture(root), expected)).toBe(true),
          dispose: host.dispose,
        };
      },
      false,
      600000,
    );
  }
