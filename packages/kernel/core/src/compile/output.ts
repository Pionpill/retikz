import type { AxisAlignedBounds } from '@retikz/math';

import type { AnyCompositeDefinition, Scene, ScenePrimitive, SceneResource } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import type { IRScene } from '../schemas';
import type { SceneCompilationSnapshot } from './compile';
import { filterAnimations } from './orchestration/animation';
import { orderCompileWarnings } from './orchestration/diagnostics';
import type { CompileProvenanceTracker } from './provenance';
import { computeLayoutFromBounds, viewBoxToLayout } from './scene';
import type { CompileResult, CompositeArtifact, CompositeArtifactOf } from './types';
import type { CompileWarning, InputCompileWarning } from './warning';

/** Scene 自动边界的默认留白 */
const DEFAULT_LAYOUT_PADDING = 10;

/** 已合并的编译内容与 Scene 快照组装配置 */
export type InputSceneCompilationSnapshot = Readonly<{
  /** Scene 根级视口与动画声明 */
  root: Pick<IRScene, 'viewBox' | 'animations'>;
  /** 已完成合并的图元 */
  primitives: Array<ScenePrimitive>;
  /** 已完成合并的资源 */
  resources: Array<SceneResource>;
  /** 图元贡献的布局边界 */
  layoutBounds: AxisAlignedBounds | undefined;
  /** 布局数值的舍入函数 */
  round: (value: number) => number;
  /** 自动布局的留白，默认 10 */
  padding?: number;
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
  input: InputSceneCompilationSnapshot,
): SceneCompilationSnapshot<TComposites> => {
  const {
    root,
    primitives,
    resources,
    layoutBounds,
    round,
    padding = DEFAULT_LAYOUT_PADDING,
    provenanceTracker,
  } = input;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.padding '${padding}' must be a non-negative finite number`,
    );
  }

  const diagnostics: Array<InputCompileWarning> = [...(input.diagnostics ?? [])];
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
        ? computeLayoutFromBounds(layoutBounds, padding, round)
        : viewBoxToLayout(root.viewBox, round),
    ...(resources.length === 0 ? {} : { resources }),
    ...(animations === undefined ? {} : { animations }),
  };
  const provenance = provenanceTracker?.capture(primitives);

  return Object.freeze({
    result: Object.freeze({
      scene,
      artifacts: Object.freeze([...(input.artifacts ?? [])]),
    }) as CompileResult<CompositeArtifactOf<TComposites[number]>>,
    diagnostics: Object.freeze(orderCompileWarnings(diagnostics)),
    ...(provenance === undefined ? {} : { provenance }),
  });
};
