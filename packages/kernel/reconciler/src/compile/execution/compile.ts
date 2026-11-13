import type { AnyCompositeDefinition, CompileWarning, IRScene, Scene } from '@retikz/core';
import {
  RetikzCoreError,
  RetikzCoreErrorCode,
  calculateLayoutFromBounds,
  resolveAnimations,
  viewBoxToLayout,
} from '@retikz/core';

import type { CompileRuntime } from '../runtime';
import type { CompositeArtifactOf } from '../shared';
import { orderCompileWarnings } from '../shared';
import type { SceneCompilationSnapshot } from '../types';
import { assembleCompileSubtree } from './subtree';
import type { SubtreeCompilation } from './subtree';

/** Scene 自动边界的默认留白 */
const DEFAULT_LAYOUT_PADDING = 10;

/** 完整编译根子树并组装 Scene 快照；padding 只在最终组装时使用 */
export const compileScene = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
): SceneCompilationSnapshot<TComposite> =>
  finalizeSceneCompilation<TComposite>(root, runtime, assembleCompileSubtree(root.children, runtime));

/** 将已完成的元素贡献与本批资源、来源及诊断合并为快照，不执行元素编译 */
export const finalizeSceneCompilation = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
  subtree: SubtreeCompilation,
): SceneCompilationSnapshot<TComposite> => {
  const { paintRegistry, clipRegistry, diagnosticCollector } = runtime.state.workspace;
  const primitives = subtree.primitives;
  const resources = { paints: paintRegistry.getResources(), clips: clipRegistry.getResources() };
  const round = runtime.context.layout.round;
  const { padding = DEFAULT_LAYOUT_PADDING } = runtime.context;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.padding '${padding}' must be a non-negative finite number`,
    );
  }

  const diagnostics: Array<CompileWarning> = [...diagnosticCollector.warnings];
  const animations = resolveAnimations(root.animations, {
    target: 'root',
    irPath: [],
    onWarn: warning => {
      diagnostics.push(warning);
    },
  });
  const scene: Scene = {
    primitives,
    layout:
      root.viewBox === undefined
        ? calculateLayoutFromBounds(subtree.visualBounds, padding, round)
        : viewBoxToLayout(root.viewBox, round),
    ...(resources.paints.length === 0 && resources.clips.length === 0 ? {} : { resources }),
    ...(animations === undefined ? {} : { animations }),
  };
  const provenance = runtime.state.execution.provenanceTracker?.capture(primitives);

  return Object.freeze({
    result: Object.freeze({
      scene,
      // 产物归属由注册定义保证，在聚合输出边界恢复调用方的精确产物类型
      artifacts: Object.freeze([...subtree.artifacts]) as ReadonlyArray<CompositeArtifactOf<TComposite>>,
    }),
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
    ...(provenance === undefined ? {} : { provenance }),
  });
};
