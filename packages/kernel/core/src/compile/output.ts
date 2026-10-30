import type { AxisAlignedBounds } from '@retikz/math';

import type { AnyCompositeDefinition, Scene, ScenePrimitive, SceneResource } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import type { IRScene } from '../schemas';
import type { SceneCompilationSnapshot } from './compile';
import type { SharedCompileContext } from './context';
import type { CompileOutput } from './element';
import { assembleCompileOutputs } from './element';
import { orderCompileArtifacts } from './orchestration';
import { filterAnimations } from './orchestration/animation';
import { collectLayoutBounds } from './orchestration/bounds';
import { orderCompileWarnings } from './orchestration/diagnostics';
import type { CompileProvenanceTracker } from './provenance';
import { computeLayoutFromBounds, viewBoxToLayout } from './scene';
import type { CompileResult, CompositeArtifact, CompositeArtifactOf } from './types';
import type { CompileWarning, InputCompileWarning } from './warning';

/** Scene 自动边界的默认留白 */
const DEFAULT_LAYOUT_PADDING = 10;

/** Scene 组装所需的附属贡献与来源记录 */
export type SceneCompilationMetadata = Readonly<{
  /** 按声明顺序整理的产物 */
  artifacts?: ReadonlyArray<CompositeArtifact>;
  /** 已完成计算的诊断 */
  diagnostics?: ReadonlyArray<CompileWarning>;
  /** 本次来源记录，随图元复制同步转移，并在最终组装时生成快照 */
  provenanceTracker?: CompileProvenanceTracker;
}>;

/** 完成 Scene 组装的共同底层，不执行元素编译 */
export const assembleSceneCompilationSnapshot = <
  const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly [],
>(
  root: Pick<IRScene, 'viewBox' | 'animations'>,
  primitives: Array<ScenePrimitive>,
  resources: Array<SceneResource>,
  layoutBounds: AxisAlignedBounds | undefined,
  shared: SharedCompileContext,
  metadata: SceneCompilationMetadata,
  padding = DEFAULT_LAYOUT_PADDING,
): SceneCompilationSnapshot<TComposites> => {
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.padding '${padding}' must be a non-negative finite number`,
    );
  }

  const diagnostics: Array<InputCompileWarning> = [...(metadata.diagnostics ?? [])];
  const animations = filterAnimations(root.animations, {
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
        ? computeLayoutFromBounds(layoutBounds, padding, shared.layout.round)
        : viewBoxToLayout(root.viewBox, shared.layout.round),
    ...(resources.length === 0 ? {} : { resources }),
    ...(animations === undefined ? {} : { animations }),
  };
  const provenance = metadata.provenanceTracker?.capture(primitives);

  return Object.freeze({
    result: Object.freeze({
      scene,
      artifacts: Object.freeze([...(metadata.artifacts ?? [])]),
    }) as CompileResult<CompositeArtifactOf<TComposites[number]>>,
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
    ...(provenance === undefined ? {} : { provenance }),
  });
};

/** 按声明顺序组装局部输出与同版本附属贡献，不重算任何元素 */
export const assembleSceneCompilation = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  root: Pick<IRScene, 'viewBox' | 'animations'>,
  outputs: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  metadata: SceneCompilationMetadata = {},
  padding?: number,
): SceneCompilationSnapshot<TComposites> => {
  const output = assembleCompileOutputs(outputs, shared, metadata.provenanceTracker);
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of output.bounds) {
    bounds = collectLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  const artifacts = [...(metadata.artifacts ?? [])];
  const diagnostics: Array<InputCompileWarning> = [...(metadata.diagnostics ?? [])];
  return assembleSceneCompilationSnapshot<TComposites>(
    root,
    output.primitives,
    output.resources,
    bounds,
    shared,
    {
      ...metadata,
      artifacts: orderCompileArtifacts(artifacts),
      diagnostics: orderCompileWarnings(diagnostics),
    },
    padding,
  );
};
