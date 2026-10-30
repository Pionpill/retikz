import type { AxisAlignedBounds } from '@retikz/math';

import type { ScenePrimitive, SceneResource } from '../contract';
import type { CanonicalDropShadow, IRPosition } from '../schemas';
import type { SharedCompileContext } from './context';
import type { CompileProvenanceTracker } from './provenance';
import { createClipRegistry, createPaintRegistry, importSceneResources, remapPrimitiveResources } from './resource';
import { collectLayoutBounds } from './scene';

/** 元素本地可见边界的一项贡献，独立保留阴影语义 */
export type CompileBounds = Readonly<{
  /** 本地边界点 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** 本项阴影 */
  shadow?: CanonicalDropShadow;
  /** 外框等装饰边界，祖先 clip 可裁减其可见范围 */
  decoration?: boolean;
}>;

/** 与本地资源配套的输出片段，不包含重复的子树 */
export type CompileOutput = Readonly<{
  /** 本元素绘制贡献 */
  primitives: Array<ScenePrimitive>;
  /** 同层输出排序值 */
  zIndex?: number;
  /** 图元引用的局部资源 */
  resources: Array<SceneResource>;
  /** 可见边界贡献 */
  bounds: ReadonlyArray<CompileBounds>;
}>;

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const computeCompileOutputBounds = (output: Pick<CompileOutput, 'bounds'>): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of output.bounds) {
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
  const bounds: Array<CompileOutput['bounds'][number]> = [];
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
