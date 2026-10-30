import { assembleCompileOutputs, assembleSceneCompilationSnapshot, computeCompileOutputBounds } from '@retikz/core';
import type {
  CompileOutput,
  CompileProvenanceTracker,
  CompileWarning,
  IRScene,
  SharedCompileContext,
} from '@retikz/core';

/** 将本批有效片段交给 Core 合并并完成 Scene 收尾 */
export const assembleWeaveCompilation = (
  input: Readonly<{
    /** 当前声明根 */
    root: Pick<IRScene, 'viewBox' | 'animations'>;
    /** 本批按声明顺序选定的输出 */
    outputs: ReadonlyArray<CompileOutput>;
    /** 树级共享计算服务 */
    shared: SharedCompileContext;
    /** 本批诊断 */
    diagnostics: ReadonlyArray<CompileWarning>;
    /** 本批来源记录 */
    provenanceTracker: CompileProvenanceTracker;
    /** Scene 留白 */
    padding?: number;
  }>,
) => {
  const output = assembleCompileOutputs(input.outputs, input.shared, input.provenanceTracker);
  return assembleSceneCompilationSnapshot({
    root: input.root,
    primitives: output.primitives,
    resources: output.resources,
    layoutBounds: computeCompileOutputBounds(output),
    round: input.shared.layout.round,
    diagnostics: input.diagnostics,
    provenanceTracker: input.provenanceTracker,
    padding: input.padding,
  });
};
