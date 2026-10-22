import type { AnyCompositeDefinition } from '@retikz/core';
import type { ReconcilerOutput } from '@retikz/reconciler';
import type { ReconcilerCommitTarget } from '@retikz/reconciler';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import type { PreparedProcessingInput } from '../types';
import type { ProcessingController } from '../types';

/** processing 与 DOM materializer 间固定的内部事务 participant */
export type ProcessingTransactionParticipant = Readonly<{
  /** 随编译输出准备的宿主目标 */
  target: ReconcilerCommitTarget;
  /** 设置本次候选宿主配置 */
  update: (input: ProcessingParticipantUpdateInput) => void;
  /** 首次发布完成后连接宿主读取 */
  connect?: () => void;
  /** 设置独立的候选渲染配置 */
  updateParticipant?: (revision: number) => void;
}>;

/** 生成 transaction participant update 时可读取的 processing 候选状态 */
export type ProcessingParticipantUpdateInput = Readonly<{
  /** 本次 source 归一后的 processing 输入 */
  prepared: PreparedProcessingInput;
  /** controller 将要发布的 revision */
  revision: number;
  /** 本次事务由 source 更新还是 participant 配置更新触发 */
  kind: 'source' | 'participant';
}>;

/** 在 processing 创建唯一 Runtime 前构造固定 DOM participant 的内部工厂 */
export type ProcessingTransactionParticipantFactory = (
  context: Readonly<{
    /** runtime 创建时的初始 processing 输入 */
    initial: PreparedProcessingInput;
    /** 从同一 Core candidate 读取 compile-driver readonly layers */
    resolveReadonlyLayers: (
      output: ReconcilerOutput<ReadonlyArray<AnyCompositeDefinition>>,
    ) => ReadonlyArray<RenderReadonlyLayer>;
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
    updatePrepared: (input: PreparedProcessingInput, assertCurrent?: () => void) => void;
  }>;
