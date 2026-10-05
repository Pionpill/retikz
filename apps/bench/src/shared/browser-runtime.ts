import type { IRScene } from '@retikz/core';
import { CoreSourceDefinition, createCoreComputation } from '@retikz/core';
import type { RenderRuntimeConfigInput, RetainedRendererFactory } from '@retikz/render/runtime';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderRuntimeSourceDefinition,
} from '@retikz/render/runtime';
import type { PerformanceTraceRecord, Runtime } from '@retikz/runtime';
import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeComputationRegistry,
  createRuntime,
} from '@retikz/runtime';

/** 创建固定尺寸的真实 browser Canvas */
export const createBenchmarkCanvas = (): Readonly<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1440;
  canvas.height = 900;
  const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (context === null) throw new Error('browser benchmark: CanvasRenderingContext2D is unavailable');

  return Object.freeze({ canvas, context });
};

/** Bench runner 与交互式 Lab 共享的 retained Runtime */
export type RetainedBenchmarkSession = Readonly<{
  coreComputation: ReturnType<typeof createCoreComputation<readonly []>>;
  session: Runtime;
}>;

/** 创建使用公共 Runtime、Core 与 Render 入口的 retained benchmark session */
export const createRetainedBenchmarkSession = (
  backend: 'svg' | 'canvas',
  host: SVGSVGElement | HTMLCanvasElement,
  source: IRScene,
  records: Array<PerformanceTraceRecord>,
  rendererFactory: RetainedRendererFactory = builtinRetainedRendererFactory,
  config: RenderRuntimeConfigInput = {},
  updateStrategy?: 'auto' | 'full',
): RetainedBenchmarkSession => {
  const coreComputation = createCoreComputation({ onWarn: () => undefined });
  const handle =
    backend === 'svg'
      ? createRetainedRenderParticipant({
          backend,
          host: host as SVGSVGElement,
          rendererFactory,
          immutableOptions: { backend, idPrefix: 'retained-bench' },
          coreComputation,
        })
      : createRetainedRenderParticipant({
          backend,
          host: host as HTMLCanvasElement,
          rendererFactory,
          immutableOptions: { backend, idPrefix: 'retained-bench', devicePixelRatio: 1 },
          coreComputation,
        });
  const sources = createRuntimeSourceRegistry({ builtins: [CoreSourceDefinition, RenderRuntimeSourceDefinition] });
  const computations = createRuntimeComputationRegistry({ sources, builtins: [coreComputation] });
  const session = createRuntime({
    sources,
    computations,
    updateStrategy,
    participants: [handle.participant],
    initialSnapshots: [
      createRuntimeSourceInput(CoreSourceDefinition, source),
      createRuntimeSourceInput(RenderRuntimeSourceDefinition, config),
    ],
    trace: record => records.push(record),
  });

  return Object.freeze({ coreComputation, session });
};

/** 创建指定 renderer backend 的真实 browser host */
export const createBackendHost = (backend: 'svg' | 'canvas'): SVGSVGElement | HTMLCanvasElement => {
  if (backend === 'svg') return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  return createBenchmarkCanvas().canvas;
};
