import type { IRScene } from '@retikz/core';
import type { RenderRuntimeConfigInput, RetainedRendererFactory } from '@retikz/render/runtime';
import type { PerformanceTraceRecord, RuntimeSession } from '@retikz/runtime';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderRuntimeOwnerDefinition,
} from '@retikz/render/runtime';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
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

/** Bench runner 与交互式 Lab 共享的 retained Runtime session */
export type RetainedBenchmarkSession = Readonly<{
  coreProgram: ReturnType<typeof createCoreProgram<readonly []>>;
  session: RuntimeSession;
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
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const handle =
    backend === 'svg'
      ? createRetainedRenderParticipant({
          backend,
          host: host as SVGSVGElement,
          rendererFactory,
          immutableOptions: { backend, idPrefix: 'retained-bench' },
          coreProgram,
        })
      : createRetainedRenderParticipant({
          backend,
          host: host as HTMLCanvasElement,
          rendererFactory,
          immutableOptions: { backend, idPrefix: 'retained-bench', devicePixelRatio: 1 },
          coreProgram,
        });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const session = createRuntimeSession({
    owners,
    programs,
    updateStrategy,
    participants: [handle.participant],
    initialSnapshots: [
      createRuntimeOwnerInput(CoreOwnerDefinition, source),
      createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, config),
    ],
    trace: record => records.push(record),
  });
  return Object.freeze({ coreProgram, session });
};

/** 创建指定 renderer backend 的真实 browser host */
export const createBackendHost = (backend: 'svg' | 'canvas'): SVGSVGElement | HTMLCanvasElement => {
  if (backend === 'svg') return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  return createBenchmarkCanvas().canvas;
};
