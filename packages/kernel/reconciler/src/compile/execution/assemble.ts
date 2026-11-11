import type { AnyCompositeDefinition, IRChild, IRScene } from '@retikz/core';

import type { CompileRuntime } from '../runtime';
import { assembleSceneCompilationSnapshot } from './output';
import { SubtreeCompiler } from './subtree';
import type { SubtreeCompileOptions, SubtreeCompilation } from './types';

/** 以驱动提供的阶段能力组装输出；隔离试算显式提供自己的工作区 */
export const assembleCompileSubtree = (
  children: ReadonlyArray<IRChild>,
  runtime: CompileRuntime,
  options: SubtreeCompileOptions = {},
): SubtreeCompilation =>
  new SubtreeCompiler(children, runtime, { ...options, compileSubtree: assembleCompileSubtree }).run();

/** 将已完成的元素贡献与本批资源、来源及诊断合并为快照 */
export const finalizeSceneCompilation = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
  subtree: SubtreeCompilation,
) => {
  const { paintRegistry, clipRegistry, diagnosticCollector } = runtime.state.workspace;
  return assembleSceneCompilationSnapshot<TComposite>({
    root,
    primitives: subtree.primitives,
    resources: [...paintRegistry.getResources(), ...clipRegistry.getResources()],
    layoutBounds: subtree.visualBounds,
    round: runtime.context.layout.round,
    artifacts: subtree.artifacts,
    diagnostics: diagnosticCollector.warnings,
    provenanceTracker: runtime.state.execution.provenanceTracker,
    padding: runtime.context.padding,
  });
};
