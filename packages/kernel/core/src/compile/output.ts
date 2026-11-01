import type { AxisAlignedBounds } from '@retikz/math';

import type { ScenePrimitive } from '../contract';
import type { SharedCompileContext } from './context';
import type { CompileProvenanceTracker } from './provenance';
import { createClipRegistry, createPaintRegistry, importSceneResources, remapPrimitiveResources } from './resource';
import { collectLayoutBounds } from './scene';
import type { CompileBounds, CompileOutput } from './shared';

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const computeCompileOutputBounds = (contributions: CompileOutput['bounds']): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of contributions) {
    bounds = collectLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  return bounds;
};

/** 按声明顺序导入局部输出及资源，不重新运行 provider */
export const assembleCompileOutputs = (
  outputs: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  provenance?: CompileProvenanceTracker,
): CompileOutput => {
  const paint = createPaintRegistry(shared.layout.round);
  const clip = createClipRegistry(shared.layout.round, shared.limits.maxClipDepth);
  const fragments: Array<{ zIndex: number; primitives: Array<ScenePrimitive> }> = [];
  const bounds: Array<CompileBounds> = [];
  for (const output of outputs) {
    const ids = importSceneResources(output.resources, paint, clip);
    const primitives = output.primitives.map(primitive => remapPrimitiveResources(primitive, ids));
    provenance?.transferPrimitives(output.primitives, primitives);
    fragments.push({
      zIndex: output.zIndex ?? 0,
      primitives,
    });
    bounds.push(...output.bounds);
  }
  return Object.freeze({
    primitives: fragments.sort((a, b) => a.zIndex - b.zIndex).flatMap(fragment => fragment.primitives),
    resources: [...paint.resources(), ...clip.resources()],
    bounds,
  });
};
