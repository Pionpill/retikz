import type { GroupPrimitive } from '../../contract';
import { resolveClip } from '../../resolve/resource';
import type { CompiledNodeLayout } from '../node';
import { filterAnimations } from '../orchestration';
import type { InputScopeCompile } from '../scope';
import {
  createIntrinsicScopeLayout,
  resolveFinalScopeTransforms,
  resolvePreliminaryScopeTransforms,
  resolveScopePositionTarget,
} from '../scope';
import { resolveScopeContext, runElementCompilation } from './context';
import type { CompiledScope, ElementCompileOptions, ElementCompileResult, ScopeCompilationPreparation } from './types';

/** Scope 自身编译上下文，子布局由调用者按依赖就绪顺序提供 */
export type ScopeCompileContext = ElementCompileOptions;

/** 在子元素计算前解析 Scope 样式、放置目标和可提前确定的变换 */
export const prepareScopeCompilation = (
  input: InputScopeCompile,
  context: ScopeCompileContext,
): ElementCompileResult<ScopeCompilationPreparation> =>
  runElementCompilation(context, workspace => {
    const geometry = { ...workspace, irPath: context.irPath };
    return Object.freeze({
      scope: resolveScopeContext(input, context.environment, context.context, context.irPath),
      positionTarget: resolveScopePositionTarget(input, geometry),
      preliminaryTransforms: resolvePreliminaryScopeTransforms(input, geometry),
    });
  });

/** 聚合已完成的局部子布局并生成 Scope 自身输出，不递归编译 children */
export const compileScope = (
  input: InputScopeCompile,
  preparation: ScopeCompilationPreparation,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  context: ScopeCompileContext,
): ElementCompileResult<CompiledScope> =>
  runElementCompilation(context, workspace => {
    const envelope = createIntrinsicScopeLayout(input, layouts, context.environment);
    const transforms = resolveFinalScopeTransforms(
      input,
      { ...workspace, irPath: context.irPath },
      envelope,
      preparation.positionTarget,
      preparation.preliminaryTransforms,
    );
    const group: Omit<GroupPrimitive, 'children'> = { type: 'group' };
    if (input.id !== undefined) group.id = input.id;
    if (input.meta !== undefined) group.meta = input.meta;
    if (transforms.length > 0) group.transforms = transforms;
    const animations = filterAnimations(input.animations, {
      target: 'element',
      onWarn: workspace.onWarn,
      irPath: context.irPath,
    });
    if (animations !== undefined) group.animations = animations;
    if (input.clip !== undefined) {
      group.clipRef = workspace.clip.register(
        resolveClip(input.clip, {
          clipRegistry: context.environment.clips,
          irPath: `${context.irPath}.clip`,
        }),
      );
    }
    return Object.freeze({
      irPath: context.irPath,
      envelope,
      group: Object.freeze(group),
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives: [],
        resources: [...workspace.paint.resources(), ...workspace.clip.resources()],
        bounds: [],
      }),
    });
  });
