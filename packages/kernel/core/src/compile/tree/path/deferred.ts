import type { CompileOccurrenceLocator } from '../../../contract';
import { resolveAnimations } from '../../../resolve';
import type { IRPathBase } from '../../../schemas';
import type { LayoutBoundsContribution } from '../../layout';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath, createCompileInvariantError } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { PATH_PLACEHOLDER } from '../shared';
import type { TreeOutputState, InternalScenePrimitive } from '../shared';
import { compilePathState } from './compile';
import { createPathTargetResolver } from './index';
import type { InputPathCompilation } from './types';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = InputPathCompilation & {
  /** path 几何完成后写入的当前 frame bbox 贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** path allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 延续入队时的占位跳过标记，路径完成后不单独参与父布局占位汇总 */
  skipAllocation?: boolean;
  /** path 在所属图元数组中的原位回填槽 */
  placeholderSlot: {
    /** 持有占位项、等待原位回填的图元数组 */
    primitives: Array<InternalScenePrimitive>;
    /** 需要被最终路径图元替换的对象引用 */
    placeholder: { type: typeof PATH_PLACEHOLDER };
  };
  /** 产生 path primitive 的语义 owner */
  semanticOwner?: CompileOwnerKey;
  /** 编译期排序用 zIndex，不写入 Scene primitive */
  zIndex?: number;
};

/** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
export const queuePathChild = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  child: IRPathBase,
  index: number,
  frame: SubtreeCompileRuntime,
  occurrence: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): void => {
  const {
    context: {
      transformChains: scopeChain,
      pathPrefix: locatorPrefix,
      style: { defaults: scopeDefaults },
    },
    state: { primitives, paths },
  } = frame;
  const pathIrPath = createCompileChildPath(locatorPrefix, index);
  const placeholder = { type: PATH_PLACEHOLDER } as const;
  primitives.push(placeholder);
  const pending: PendingPathEmission = {
    path: {
      ...child,
      animations: resolveAnimations(child.animations, {
        target: 'element',
        onWarn: runtime.state.workspace.diagnosticCollector.collect,
        irPath: pathIrPath,
      }),
    },
    irPath: pathIrPath,
    scopeChain,
    bounds: frame.state.bounds,
    allocations: frame.state.allocations,
    ...(frame.context.layout?.skipAllocation === undefined
      ? {}
      : { skipAllocation: frame.context.layout.skipAllocation }),
    placeholderSlot: { primitives, placeholder },
    occurrence,
    theme: frame.context.style.theme,
    scopeDefaults,
    ...(semanticOwner === undefined ? {} : { semanticOwner }),
    zIndex: child.zIndex,
  };
  output.pendingPathCount++;
  paths.push(pending);
};

/** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
export const flushPendingPathEmissions = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  pendingPaths: ReadonlyArray<PendingPathEmission>,
): void => {
  if (pendingPaths.length === 0) return;

  runtime.state.execution.namespaceStack.setPhase('resolving');

  try {
    for (const pendingPath of pendingPaths) {
      const targetResolver = createPathTargetResolver(chain => createTreePositionContext(runtime, chain));
      const { result, resolution } = runtime.state.execution.withWarningOccurrence(pendingPath.occurrence, () =>
        compilePathState(pendingPath, targetResolver, {
          shared: runtime.context,
          workspace: runtime.state.workspace,
          resolveTransform: runtime.state.execution.scopeTransformComposer.resolve,
        }),
      );
      const rawPrimitives = result?.primitives ?? [];
      const primitives =
        runtime.state.execution.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
      const idx = pendingPath.placeholderSlot.primitives.indexOf(pendingPath.placeholderSlot.placeholder);
      if (idx === -1) {
        throw createCompileInvariantError('internal: path placeholder missing from its sink');
      }

      pendingPath.placeholderSlot.primitives.splice(idx, 1, ...primitives);
      if (pendingPath.semanticOwner !== undefined) {
        runtime.state.execution.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
      }

      output.pendingPathCount--;

      if (pendingPath.zIndex !== undefined) {
        for (const prim of primitives) output.zIndexOf.set(prim, pendingPath.zIndex);
      }
      if (result !== null) {
        pendingPath.bounds.push({
          boundsPoints: [...result.boundsPoints],
          shadow: resolution.path.shadow,
        });
        pendingPath.allocations.push({
          boundsPoints: [...result.boundsPoints],
          skipAllocation: pendingPath.skipAllocation,
        });
      }
    }
  } finally {
    runtime.state.execution.namespaceStack.setPhase('registering');
  }
};
