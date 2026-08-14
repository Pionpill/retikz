import type { AnyCompositeDefinition, CoreProgramDefinition, CoreProgramOutput } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';
import type {
  RuntimeCommitParticipantToken,
  RuntimeOwnerInput,
  RuntimeOwnerToken,
  RuntimeOwnerUpdate,
  RuntimeSession,
} from '@retikz/runtime';

import type { PreparedProcessingInput } from '../types';
import type { ProcessingController } from '../types';

/** processing 与 DOM materializer 间固定的内部事务 participant */
export type ProcessingTransactionParticipant = Readonly<{
  /** participant 需要追加到 processing Runtime session 的 owner 定义 */
  owners: ReadonlyArray<RuntimeOwnerToken>;
  /** session 初始 transaction 需要的 participant snapshot */
  initialSnapshots: ReadonlyArray<RuntimeOwnerInput>;
  /** 与 Core/result participant 同次提交的 Runtime participant */
  participant: RuntimeCommitParticipantToken;
  /** 每次 source update 生成的 participant owner 更新 */
  update: (input: ProcessingParticipantUpdateInput) => ReadonlyArray<RuntimeOwnerUpdate>;
  /** session 创建完成后连接用于读取 committed participant 的 session */
  connect?: (session: RuntimeSession) => void;
  /** 仅更新 participant 自身配置时生成 owner 更新 */
  updateParticipant?: (revision: number) => ReadonlyArray<RuntimeOwnerUpdate>;
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

/** 在 processing 创建唯一 Runtime session 前构造固定 DOM participant 的内部工厂 */
export type ProcessingTransactionParticipantFactory = (
  context: Readonly<{
    /** session 创建时的初始 processing 输入 */
    initial: PreparedProcessingInput;
    /** 该 session 唯一的 Core Program */
    coreProgram: CoreProgramDefinition<ReadonlyArray<AnyCompositeDefinition>>;
    /** 从同一 Core candidate 读取 compile-driver readonly layers */
    resolveReadonlyLayers: (
      output: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>,
    ) => ReadonlyArray<RenderReadonlyLayer>;
  }>,
) => ProcessingTransactionParticipant;

/** 仅供 DOM materializer 驱动固定 participant 配置的私有 controller */
export type InternalProcessingController = ProcessingController &
  Readonly<{
    /** 在同一 Runtime transaction 更新固定 participant 的配置 */
    updateParticipant: () => void;
  }>;
