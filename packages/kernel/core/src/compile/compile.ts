import type { AnyCompositeDefinition, Scene } from '../contract';
import type { IRScene } from '../schemas';
import type {
  CompileOptions,
  CompileResult,
  CompositeArtifactOf,
} from './types';

import { compileChildrenToPrimitives, createCompileContext, filterAnimations } from './orchestration';
import { assertFiniteLayout, computeLayoutFromBounds, viewBoxToLayout } from './scene';

export { CompileWarningCode } from './constants';
export type {
  CompileArtifact,
  CompileArtifactOptions,
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
  CompileResult,
} from './types';
export type { CompileWarning } from './warning';

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description 解析节点、scope、path、资源、动画与 layout-aware composite，并显式返回 Scene 和 typed artifacts
 */
export const compileToScene = <
  const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly [],
>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
): CompileResult<CompositeArtifactOf<TComposites[number]>> => {
  const context = createCompileContext(ir, options ?? {});
  const { loweredIr, layoutPadding, round, onWarn, paint, clip } = context;
  const { primitives, layoutBounds, artifacts } = compileChildrenToPrimitives(loweredIr.children, context);

  const resources = [...paint.resources(), ...clip.resources()];
  const rootAnimations = filterAnimations(loweredIr.animations, { target: 'root', onWarn, irPath: 'scene' });
  const scene: Scene = {
    primitives,
    layout:
      loweredIr.viewBox !== undefined
        ? viewBoxToLayout(loweredIr.viewBox, round)
        : assertFiniteLayout(computeLayoutFromBounds(layoutBounds, layoutPadding, round)),
    ...(resources.length > 0 ? { resources } : {}),
    ...(rootAnimations !== undefined ? { animations: rootAnimations } : {}),
  };
  return Object.freeze({
    scene,
    artifacts: Object.freeze(artifacts),
  }) as CompileResult<CompositeArtifactOf<TComposites[number]>>;
};
