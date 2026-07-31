import type { RuntimeRevision } from '@retikz/runtime';

import type { AnyCompositeDefinition, Scene } from '../contract';
import type { IRScene } from '../schemas';
import type { RuntimePrimitiveMetadataTable } from './orchestration';
import type { CompileOptions, CompileResult, CompositeArtifactOf } from './types';
import type { CompileWarning } from './warning';

import {
  compileChildrenToPrimitives,
  createCompileContext,
  createRuntimeTopologyTracker,
  filterAnimations,
  orderCompileWarnings,
  sealInspectionPlane,
} from './orchestration';
import { assertFiniteLayout, computeLayoutFromBounds, viewBoxToLayout } from './scene';
import { formatCompileWarning } from './warning';

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

/** Core full compile 的内部输出，供同步入口与 Runtime Program 共享 */
export type CoreCompileSnapshot<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 仅在完整 compile 成功后可提交的 canonical warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** Runtime Program 路径产生的 primitive identity metadata */
  primitiveMetadata?: RuntimePrimitiveMetadataTable;
}>;

/** Core full compile 的内部执行选项 */
export type CoreCompileExecutionOptions = Readonly<{
  /** 需要 Runtime topology 时绑定 candidate revision */
  candidateRevision?: RuntimeRevision;
}>;

/** 执行一次不派发 warning 的完整 Core compile */
export const compileCoreSnapshot = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
  execution: CoreCompileExecutionOptions = {},
): CoreCompileSnapshot<TComposites> => {
  const diagnostics: Array<CompileWarning> = [];
  const context = createCompileContext(ir, { ...(options ?? {}), onWarn: warning => diagnostics.push(warning) });
  const { loweredIr, layoutPadding, round, onWarn, paint, clip } = context;
  const identityTracker =
    execution.candidateRevision === undefined ? undefined : createRuntimeTopologyTracker(execution.candidateRevision);
  const { primitives, layoutBounds, artifacts, inspections } = compileChildrenToPrimitives(
    loweredIr.children,
    context,
    {
      ...(identityTracker === undefined ? {} : { identityTracker }),
    },
  );

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
  if (context.trace !== undefined) {
    context.trace.reporter.report({
      phase: 'compile',
      unit: 'ir-child',
      outcome: 'full',
      visited: context.trace.visited,
      reused: 0,
      changed: context.trace.visited,
    });
  }
  return Object.freeze({
    result: Object.freeze({
      scene,
      artifacts: Object.freeze(artifacts),
      inspection: sealInspectionPlane(inspections),
    }) as CompileResult<CompositeArtifactOf<TComposites[number]>>,
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
    ...(identityTracker === undefined ? {} : { primitiveMetadata: identityTracker.metadata }),
  });
};

/** IR → Scene 纯函数转换，所有 adapter 共享 */
export const compileToScene = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
): CompileResult<CompositeArtifactOf<TComposites[number]>> => {
  const snapshot = compileCoreSnapshot(ir, options);
  const warningSink =
    options?.onWarn ??
    ((warning: CompileWarning): void => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
      console.warn(formatCompileWarning(warning));
    });
  snapshot.diagnostics.forEach(warningSink);
  return snapshot.result;
};
