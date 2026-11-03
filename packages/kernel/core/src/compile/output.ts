import type { AxisAlignedBounds } from '@retikz/math';

import type { ScenePrimitive } from '../contract';
import { createClipRegistry, createPaintRegistry, importSceneResources } from './resource';
import type { SharedCompileContext } from './runtime';
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
): CompileOutput => {
  const paint = createPaintRegistry(shared.layout.round);
  const clip = createClipRegistry(shared.layout.round, shared.limits.maxClipDepth);
  const fragments: Array<{ zIndex: number; primitives: Array<ScenePrimitive> }> = [];
  const bounds: Array<CompileBounds> = [];
  for (const output of outputs) {
    importSceneResources(output.resources, paint, clip);
    fragments.push({
      zIndex: output.zIndex ?? 0,
      primitives: output.primitives,
    });
    bounds.push(...output.bounds);
  }
  return Object.freeze({
    primitives: fragments.sort((a, b) => a.zIndex - b.zIndex).flatMap(fragment => fragment.primitives),
    resources: [...paint.getResources(), ...clip.getResources()],
    bounds,
  });
};
