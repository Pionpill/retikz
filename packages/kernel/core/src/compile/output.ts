import type { AxisAlignedBounds } from '@retikz/math';

import type { AnyCompositeDefinition, Scene, ScenePrimitive, SceneResource } from '../contract';
import { visitSceneContent } from '../contract';
import type { IRScene } from '../schemas';
import type { PreparedSceneCompilation } from './compile';
import type { CompileOutput } from './element';
import { assembleCompileOutputs } from './element';
import type { CompileEnvironment } from './environment';
import type { CompileProvenanceTracker } from './orchestration';
import { orderCompileArtifacts } from './orchestration';
import { filterAnimations } from './orchestration/animation';
import { collectLayoutBounds } from './orchestration/bounds';
import { orderCompileWarnings } from './orchestration/diagnostics';
import type { CompileProvenance } from './provenance';
import { assertFiniteLayout, computeLayoutFromBounds, viewBoxToLayout } from './scene';
import type { CompileResult, CompositeArtifact, CompositeArtifactOf } from './types';
import type { CompileWarning, InputCompileWarning } from './warning';

/** 与最终输出同版本的已完成附属贡献 */
export type SceneCompilationMetadata = Readonly<{
  /** 按声明顺序整理的产物 */
  artifacts?: ReadonlyArray<CompositeArtifact>;
  /** 已完成计算的诊断 */
  diagnostics?: ReadonlyArray<CompileWarning>;
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
  const diagnostics: Array<InputCompileWarning> = [...(metadata.diagnostics ?? [])];
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
  visitSceneContent(scene);
  return Object.freeze({
    result: Object.freeze({
      scene,
      artifacts: Object.freeze([...(metadata.artifacts ?? [])]),
    }) as CompileResult<CompositeArtifactOf<TComposites[number]>>,
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
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
    bounds = collectLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  const artifacts = [...(metadata.artifacts ?? [])];
  const diagnostics: Array<InputCompileWarning> = [...(metadata.diagnostics ?? [])];
  return assemblePreparedScene<TComposites>(root, output.primitives, output.resources, bounds, environment, {
    ...metadata,
    provenance: metadata.provenanceTracker?.capture(output.primitives) ?? metadata.provenance,
    artifacts: orderCompileArtifacts(artifacts),
    diagnostics: orderCompileWarnings(diagnostics),
  });
};
