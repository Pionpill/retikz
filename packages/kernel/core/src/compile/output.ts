import type { AxisAlignedBounds } from '@retikz/math';

import type {
  AnyCompositeDefinition,
  CompileObserverOutput,
  Scene,
  ScenePrimitive,
  SceneResource,
  SpatialHandleIndex,
} from '../contract';
import type { IRScene } from '../schemas';
import { cloneAndFreezeJson } from '../shared/json';
import type { PreparedSceneCompilation } from './compile';
import type { CompileOutput } from './element';
import { assembleCompileOutputs } from './element';
import type { CompileEnvironment } from './environment';
import { projectNodeLayoutObservation } from './node';
import type { CompileProvenanceTracker } from './orchestration';
import {
  createCompileContext,
  dispatchCompileObservations,
  freezeCompileArtifact,
  orderCompileArtifacts,
} from './orchestration';
import type { CompileObservationRuntime } from './orchestration';
import { filterAnimations } from './orchestration/animation';
import { collectLayoutBounds } from './orchestration/bounds';
import { orderCompileWarnings } from './orchestration/diagnostics';
import { materializeSpatialHandleIndex } from './orchestration/spatial-handle';
import type { CompileProvenance } from './provenance';
import { assertFiniteLayout, computeLayoutFromBounds, viewBoxToLayout } from './scene';
import type { CompileArtifact, CompileResult, CompositeArtifactOf } from './types';
import type { CompileWarning, CompileWarningInput } from './warning';

/** 与最终输出同版本的已完成附属贡献 */
export type SceneCompilationMetadata = Readonly<{
  /** 按声明顺序整理的产物 */
  artifacts?: ReadonlyArray<CompileArtifact>;
  /** 与元素采集阶段相同的独占观察会话 */
  observation?: CompileObservationRuntime;
  /** 已完成计算的诊断 */
  diagnostics?: ReadonlyArray<CompileWarning>;
  /** 已完成的观察结果 */
  observerOutputs?: ReadonlyArray<CompileObserverOutput>;
  /** 已最终投影的空间句柄索引 */
  spatialHandles?: SpatialHandleIndex;
  /** 与输出顺序配对的来源信息 */
  provenance?: CompileProvenance;
  /** 本次来源记录，组装时随图元复制同步转移 */
  provenanceTracker?: CompileProvenanceTracker;
}>;

/** 完成 Scene 组装的共同底层，不执行元素编译 */
export const assemblePreparedScene = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  root: Pick<IRScene, 'viewBox' | 'animations'>,
  primitives: Array<ScenePrimitive>,
  resources: Array<SceneResource>,
  layoutBounds: AxisAlignedBounds | undefined,
  environment: CompileEnvironment,
  metadata: SceneCompilationMetadata,
): PreparedSceneCompilation<TComposites> => {
  const diagnostics: Array<CompileWarningInput> = [...(metadata.diagnostics ?? [])];
  const animations = filterAnimations(root.animations, {
    target: 'root',
    irPath: 'scene',
    onWarn: warning => {
      diagnostics.push(warning);
    },
  });
  const scene: Scene = {
    primitives,
    layout:
      root.viewBox === undefined
        ? assertFiniteLayout(computeLayoutFromBounds(layoutBounds, environment.layoutPadding, environment.round))
        : viewBoxToLayout(root.viewBox, environment.round),
    ...(resources.length === 0 ? {} : { resources }),
    ...(animations === undefined ? {} : { animations }),
  };
  return Object.freeze({
    result: Object.freeze({
      scene,
      artifacts: Object.freeze([...(metadata.artifacts ?? [])]),
      spatialHandles: metadata.spatialHandles ?? materializeSpatialHandleIndex([], environment.round),
    }) as CompileResult<CompositeArtifactOf<TComposites[number]>>,
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
    observerOutputs: metadata.observerOutputs ?? Object.freeze([]),
    ...(metadata.provenance === undefined ? {} : { provenance: metadata.provenance }),
  });
};

/** 按声明顺序组装局部输出与同版本附属贡献，不重算任何元素 */
export const assembleSceneCompilation = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  root: Pick<IRScene, 'viewBox' | 'animations'>,
  outputs: ReadonlyArray<CompileOutput>,
  environment: CompileEnvironment,
  metadata: SceneCompilationMetadata = {},
): PreparedSceneCompilation<TComposites> => {
  const output = assembleCompileOutputs(outputs, environment, metadata.provenanceTracker);
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of output.bounds) {
    bounds = collectLayoutBounds(bounds, contribution.points, contribution.shadow);
  }
  const artifacts = [...(metadata.artifacts ?? [])];
  const diagnostics: Array<CompileWarningInput> = [...(metadata.diagnostics ?? [])];
  for (const entry of output.nodeLayouts ?? []) {
    artifacts.push(
      freezeCompileArtifact({
        kind: 'nodeLayout',
        occurrence: entry.occurrence,
        value: cloneAndFreezeJson(
          projectNodeLayoutObservation(entry.layout, entry.scopeChain, undefined, entry.id),
          'Node layout artifact',
        ),
      }),
    );
  }
  const observerOutputs =
    metadata.observation === undefined
      ? metadata.observerOutputs
      : dispatchCompileObservations(
          output.observations ?? [],
          metadata.observation,
          createCompileContext(
            { type: 'scene', version: 1, children: [] },
            {
              onWarn: warning => {
                diagnostics.push(warning);
              },
            },
            environment,
          ),
        );
  return assemblePreparedScene<TComposites>(root, output.primitives, output.resources, bounds, environment, {
    ...metadata,
    provenance: metadata.provenanceTracker?.capture(output.primitives) ?? metadata.provenance,
    artifacts: orderCompileArtifacts(artifacts),
    diagnostics: orderCompileWarnings(diagnostics),
    observerOutputs,
  });
};
