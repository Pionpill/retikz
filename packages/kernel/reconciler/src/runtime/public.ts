import type {
  AnyCompositeDefinition,
  CompileObserverDefinition,
  CompileObserverOutput,
  CompileOptions,
  CompileResult,
  CompileWarning,
  CompositeArtifactOf,
} from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { RuntimeComputationDefinition, RuntimeSourceToken } from '@retikz/runtime';

import { CORE_SOURCE_KEY } from '../reconcile';
import type { ScenePatch, SceneRuntimeSnapshot } from '../scene';
import type { CoreCompositeInputSourceDefinition } from './composite-input';
import type { CoreComputationRead, CoreComputationResult, CoreComputationResultInput } from './types';

/** Core compile Computation 的固定 identity */
export const CORE_COMPUTATION_ID = Object.freeze({ owner: CORE_SOURCE_KEY, key: 'compile' } as const);

/** 增量计算返回给 Runtime 的诊断码 */
export const CoreComputationDiagnosticCode = {
  /** 变化提示与完整快照不一致 */
  ChangeSetMismatch: 'CORE_CHANGESET_MISMATCH',
} as const;

export type CoreComputationDiagnosticCode = ValueOf<typeof CoreComputationDiagnosticCode>;

/** Computation 生命周期内固定的 Core compile options */
export type CoreComputationOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Omit<CompileOptions<TComposites>, 'trace'>;

/** Core Computation 的 Runtime 装配选项 */
export type CoreComputationRuntimeOptions = Readonly<{
  /** 从本次 candidate snapshot 读取实例输入，Source 与此 owner 必须同事务更新 */
  compositeInputSource?: typeof CoreCompositeInputSourceDefinition;
  /** 只负责使固定 compile definitions 外部状态失效的 owner；其 value 不进入 Core IR */
  invalidationSources?: ReadonlyArray<RuntimeSourceToken>;
  /** Computation runtime 生命周期内固定的 observer definitions */
  observers?: ReadonlyArray<CompileObserverDefinition>;
}>;

/**
 * Core Computation 对外提供的完整编译输出
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationOutput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 与 full oracle 等价的完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 按 canonical compile 顺序收集的 warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** 与 primary result 同一 candidate revision 的 observer outputs */
  observerOutputs: ReadonlyArray<CompileObserverOutput>;
}>;

/**
 * 下游 Computation、participant 与 runtime caller 可见的 Core result
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationPublicRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整编译输出 */
  output: CoreComputationOutput<TComposites>;
  /** 当前 revision 的完整 Runtime Scene */
  snapshot: SceneRuntimeSnapshot;
  /** update 相对 current revision 的原子 Patch；initial full run 缺省 */
  patch?: ScenePatch;
}>;

/**
 * 保留 composite artifact 泛型的 Core Runtime Computation Definition
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationDefinition<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  RuntimeComputationDefinition<
    CoreComputationResultInput<TComposites>,
    CoreComputationResult<TComposites>,
    CoreComputationRead<TComposites>,
    CoreComputationPublicRead<TComposites>
  >;
