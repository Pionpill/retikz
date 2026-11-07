import type { ScenePrimitive, CompileBounds, CompileOutput } from '@retikz/core';
import { createClipRegistry, createPaintRegistry } from '@retikz/core';

import { importSceneResources } from './resource';

/** 合并资源和输出所需的稳定数值能力 */
export type CompileOutputContext = Readonly<{
  /** 按输出精度圆整数值 */
  round: (value: number) => number;
  /** 裁剪资源允许的最大嵌套深度 */
  maxClipDepth: number;
}>;

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
