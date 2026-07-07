import type { Scene } from '../contract';
import type { IRScene } from '../schemas';
import type { CompileOptions } from './types';

import { compileChildrenToPrimitives, createCompileContext, filterAnimations } from './orchestration';
import { assertFiniteLayout, computeLayoutFromBounds, viewBoxToLayout } from './scene';

export { CompileWarningCode } from './constants';
export type {
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
} from './types';
export type { CompileWarning } from './warning';

/**
 * IR → Scene 纯函数转换，所有 adapter 共享。
 * @description 解析节点、scope、path、资源和动画，并输出 renderer-agnostic 的 Scene。
 */
export const compileToScene = (ir: IRScene, options?: CompileOptions): Scene => {
  const context = createCompileContext(ir, options ?? {});
  const { loweredIr, layoutPadding, round, onWarn, paint, clip } = context;
  const { primitives, layoutBounds } = compileChildrenToPrimitives(loweredIr.children, context);

  // paint 与 clip 资源同表。
  const resources = [...paint.resources(), ...clip.resources()];
  // scene 根动画先做 camera 约束校验。
  const rootAnimations = filterAnimations(loweredIr.animations, { target: 'root', onWarn, irPath: 'scene' });
  return {
    primitives,
    // 显式 viewBox 覆盖自动 layout。
    layout:
      loweredIr.viewBox !== undefined
        ? viewBoxToLayout(loweredIr.viewBox, round)
        : assertFiniteLayout(computeLayoutFromBounds(layoutBounds, layoutPadding, round)),
    // 无资源时省略字段。
    ...(resources.length > 0 ? { resources } : {}),
    // 无根动画时省略字段。
    ...(rootAnimations !== undefined ? { animations: rootAnimations } : {}),
  };
};
