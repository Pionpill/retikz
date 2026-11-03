import type { AxisAlignedBounds } from '@retikz/math';

import type { ScenePrimitive } from '../contract';
import { createClipRegistry, createPaintRegistry, importSceneResources } from './resource';
import { collectLayoutBounds } from './scene';
import type { CompileBounds, CompileOutput } from './shared';

/** 合并资源和输出所需的稳定数值能力 */
export type CompileOutputContext = Readonly<{
  /** 按输出精度圆整数值 */
  round: (value: number) => number;
  /** 裁剪资源允许的最大嵌套深度 */
  maxClipDepth: number;
}>;

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
  context: CompileOutputContext,
): CompileOutput => {
  const paint = createPaintRegistry(context.round);
  const clip = createClipRegistry(context.round, context.maxClipDepth);
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
