import type { ReconcilerCommitTarget, WeaveBatch } from '@retikz/reconciler';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import type { VanillaReconcilerOutput } from '../compile-driver';
import type { InputPreparedProcessing, ProcessingController, ProcessingResult } from '../types';

/** processing 与 DOM materializer 间固定的内部事务 participant */
export type ProcessingTransactionParticipant = Readonly<{
  /** 随编译输出准备的宿主目标 */
  target: ReconcilerCommitTarget;
  /** 设置本次候选宿主配置 */
  update: () => void;
  /** 首次发布完成后连接宿主读取 */
  connect?: () => void;
}>;

/** 在 processing 创建唯一 Runtime 前构造固定 DOM participant 的内部工厂 */
export type ProcessingTransactionParticipantFactory = (
  context: Readonly<{
    /** 从同一 Core candidate 读取 compile-driver readonly layers */
    resolveReadonlyLayers: (output: VanillaReconcilerOutput) => ReadonlyArray<RenderReadonlyLayer>;
  }>,
) => ProcessingTransactionParticipant;

/** 仅供 DOM materializer 驱动固定 participant 配置的私有 controller */
export type InternalProcessingController = ProcessingController &
  Readonly<{
    /** 在同一 Runtime transaction 更新固定 participant 的配置 */
    updateParticipant: () => void;
  }>;

/** 仅供共享异步准备提交完整输入的内部 controller */
export type PreparedInputProcessingController = InternalProcessingController &
  Readonly<{
    /** 不重新归一或计算贡献，直接进入同一同步事务 */
    getScopeId: (path: ReadonlyArray<number>, expected: ProcessingResult) => string;
    applyBatch: (batch: WeaveBatch, expected: ProcessingResult) => void;
    updatePrepared: (input: InputPreparedProcessing, assertCurrent?: () => void) => void;
  }>;
