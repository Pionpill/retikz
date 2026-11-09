import type { AnyCompositeDefinition } from '@retikz/core';
import type { PerformanceTraceSink } from '@retikz/foundation';

import type { ExecuteOptions, SceneCompilationSnapshot } from './compile';
import type { ReconcilerUpdateStrategy } from './constants';
import type { WeaveRoot } from './weave';

/** 同一会话发布的完整编译结果 */
export type ReconcilerResult<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Readonly<{
  /** 会话内的已提交版本，首次发布为零 */
  revision: number;
  /** 统一执行器的完整编译产物，不强制生成渲染快照 */
  compilation: SceneCompilationSnapshot<TComposites>;
  /** 增量模式的稳定作者声明根，非增量模式不保留此字段 */
  root?: WeaveRoot;
}>;

/** 宿主准备完成后的修改与恢复能力 */
export type ReconcilerPreparedCommit = Readonly<{
  /** 应用宿主修改，失败时仍须允许 rollback */
  commit: () => void;
  /** 放弃准备或恢复本次尚未最终确认的修改 */
  rollback: () => void;
  /** 释放临时资源，不改变成功发布的画面 */
  dispose: () => void;
}>;

/** 可选的单个输出提交目标，由 Render 或其它结果消费者实现 */
export type ReconcilerCommitTarget<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Readonly<{
  /** 准备本次完整输出，不发布宿主修改 */
  prepare: (
    candidate: ReconcilerResult<TComposites>,
    previous: ReconcilerResult<TComposites> | undefined,
  ) => ReconcilerPreparedCommit;
  /** 释放目标拥有的长期资源 */
  dispose?: () => void;
}>;

/** 编译会话的输出接线 */
export type SceneReconcilerOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = ExecuteOptions &
  Readonly<{
    /**
     * 是否保留用于后续更新的 Weave 阶段缓存，不表示当前调用只执行局部计算
     * @default true
     */
    incremental?: boolean;
    /** 可选宿主目标；省略时仅提交计算状态 */
    target?: ReconcilerCommitTarget<TComposites>;
    /**
     * 增量会话的批次计算策略，完整输入替换始终完整编译
     * @default ReconcilerUpdateStrategy.Auto
     */
    updateStrategy?: ReconcilerUpdateStrategy;
    /** 首次发布与后续更新的编译工作量，以及成功清理的已挂载会话数；失败操作不报告成功记录 */
    trace?: PerformanceTraceSink;
  }>;

/** 执行层非致命诊断 */
export type ReconcilerDiagnostic = Readonly<{
  /** 可用于分类处理的诊断码 */
  code: string;
  /** 产生诊断的执行步骤 */
  phase: string;
  /** 诊断严重程度 */
  severity: 'warning' | 'error';
  /** 面向调用方的诊断说明 */
  message: string;
  /** 产生诊断的可选归属 */
  owner?: string;
  /** 可供排查的原始异常 */
  cause?: unknown;
}>;

/** 下游消费的完整编译输出 */
export type ReconcilerOutput<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Pick<SceneCompilationSnapshot<TComposites>, 'result' | 'diagnostics'>;
