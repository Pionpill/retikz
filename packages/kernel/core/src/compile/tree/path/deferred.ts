import type { CompileOccurrenceLocator } from '../../../contract';
import { resolveAnimations } from '../../../resolve';
import type { IRPathBase } from '../../../schemas';
import type { LayoutBoundsContribution } from '../../layout';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath, createCompileInvariantError } from '../../shared';
import { pushAllocation } from '../allocation';
import type { TreeOutputState, InternalScenePrimitive } from '../output';
import { recordPrimitiveZIndex } from '../output';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { compilePathState } from './compile';
import { createPathTargetResolver } from './index';
import type { InputPathCompilation } from './types';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = InputPathCompilation & {
  /** path 几何完成后写入的当前 frame bbox 贡献 */
  boundsSink: Array<LayoutBoundsContribution>;
  /** path allocation 几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** path 位于该显式 composite allocation boundary 内 */
  allocationBoundary?: object;
  /** path 在所属 primitive sink 中的原位回填槽 */
  placeholderSlot: {
    /** 持有占位项、等待原位回填的图元数组 */
    primitiveSink: Array<InternalScenePrimitive>;
    /** 需要被最终路径图元替换的对象引用 */
    placeholder: PathPlaceholder;
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
      scopeChain,
      locatorPrefix,
      style: { defaults: scopeDefaults },
    },
    state: { primitiveSink, pathSink },
  } = frame;
  const pathIrPath = createCompileChildPath(locatorPrefix, index);
  const placeholder = createPathPlaceholder();
  primitiveSink.push(placeholder);
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
    boundsSink: frame.state.boundsSink,
    allocationSink: frame.state.allocationSink,
    ...(frame.context.allocationBoundary === undefined ? {} : { allocationBoundary: frame.context.allocationBoundary }),
    placeholderSlot: { primitiveSink, placeholder },
    occurrence,
    theme: frame.context.style.theme,
    scopeDefaults,
    ...(semanticOwner === undefined ? {} : { semanticOwner }),
    zIndex: child.zIndex,
  };
  output.pendingPathCount++;
  pathSink.push(pending);
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
      const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
      if (idx === -1) {
        throw createCompileInvariantError('internal: path placeholder missing from its sink');
      }

      pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
      if (pendingPath.semanticOwner !== undefined) {
        runtime.state.execution.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
      }

      output.pendingPathCount--;

      for (const prim of primitives) recordPrimitiveZIndex(output.zIndexOf, prim, pendingPath.zIndex);
      if (result !== null) {
        pendingPath.boundsSink.push({
          boundsPoints: [...result.boundsPoints],
          shadow: resolution.path.shadow,
        });
        pushAllocation(pendingPath.allocationSink, [...result.boundsPoints], pendingPath.allocationBoundary);
      }
    }
  } finally {
    runtime.state.execution.namespaceStack.setPhase('registering');
  }
};

/** path 延迟解析时使用的内部占位 primitive */
export type PathPlaceholder = {
  /** 标识等待路径编译结果回填的内部占位项 */
  type: 'path-placeholder';
};

/** 创建遍历占位项，使路径可以在节点及目标位置确定后按原顺序替换 */
export const createPathPlaceholder = (): PathPlaceholder => ({ type: 'path-placeholder' });
