import type { AnyCompositeDefinition } from '@retikz/core';
import type { PerformanceTraceSink } from '@retikz/foundation';

import type { ExecuteOptions, SceneCompilationSnapshot } from '../compile';
import type { ReconcilerUpdateStrategy } from './constants';

/** 同一会话发布的完整编译结果 */
export type ReconcilerResult<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> = Readonly<{
  /** 会话内的已提交版本，首次发布为零 */
  revision: number;
  /** 统一执行器的完整编译产物，不强制生成渲染快照 */
  compilation: SceneCompilationSnapshot<TComposite>;
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
export type ReconcilerCommitTarget<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> = Readonly<{
  /** 准备本次完整输出，不发布宿主修改 */
  prepare: (
    candidate: ReconcilerResult<TComposite>,
    previous: ReconcilerResult<TComposite> | undefined,
  ) => ReconcilerPreparedCommit;
  /** 释放目标拥有的长期资源 */
  dispose?: () => void;
}>;

/** 两种编译模式共用的执行与输出接线 */
type SceneReconcilerBaseOptions<TComposite extends AnyCompositeDefinition> = ExecuteOptions &
  Readonly<{
    /** 可选宿主目标；省略时仅提交计算状态 */
    target?: ReconcilerCommitTarget<TComposite>;
    /** 首次发布与后续更新的编译工作量，以及成功清理的已挂载会话数；失败操作不报告成功记录 */
    trace?: PerformanceTraceSink;
  }>;

/** 不保留 Weave 缓存的完整编译模式 */
export type FullSceneReconcilerOptions<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> =
  SceneReconcilerBaseOptions<TComposite> &
    Readonly<{
      /** 关闭用于后续更新的 Weave 阶段缓存 */
      incremental: false;
      /** 完整编译模式不接受批次更新策略 */
      updateStrategy?: never;
    }>;

/** 保留 Weave 缓存并支持批次更新的增量编译模式 */
export type IncrementalSceneReconcilerOptions<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> =
  SceneReconcilerBaseOptions<TComposite> &
    Readonly<{
      /**
       * 保留用于后续更新的 Weave 阶段缓存，不表示当前调用只执行局部计算
       * @default true
       */
      incremental?: true;
      /**
       * 增量会话的批次计算策略，完整输入替换始终完整编译
       * @default ReconcilerUpdateStrategy.Auto
       */
      updateStrategy?: ReconcilerUpdateStrategy;
    }>;

/** 编译会话的输出接线；仅增量模式允许配置批次更新策略 */
export type SceneReconcilerOptions<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> =
  | FullSceneReconcilerOptions<TComposite>
  | IncrementalSceneReconcilerOptions<TComposite>;

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
