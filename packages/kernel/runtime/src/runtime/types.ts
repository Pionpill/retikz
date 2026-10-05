import type { RuntimeComputationDefinition } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../participant';
import type { RuntimeSourceRegistry, RuntimeComputationRegistry } from '../registry';
import type { RuntimeSourceDefinition, RuntimeRevision } from '../source';
import type { PerformanceTraceSink } from '../trace';
import type { RuntimeSourceInput, RuntimeResult, RuntimeUpdate, RuntimeSnapshot } from '../transaction';
import type { RuntimeUpdateStrategy } from './constants';

/** 同步 Runtime runtime 的创建配置 */
export type RuntimeOptions = Readonly<{
  /** runtime state 所属的 Source registry */
  sources: RuntimeSourceRegistry;
  /** 与同一 Source registry 绑定的 Computation registry */
  computations: RuntimeComputationRegistry;
  /** 精确覆盖 Source registry 的初始完整 Snapshot commands */
  initialSnapshots: ReadonlyArray<RuntimeSourceInput>;
  /**
   * Computation 更新策略
   * @default RuntimeUpdateStrategy.Auto
   */
  updateStrategy?: RuntimeUpdateStrategy;
  /** 可选性能 trace sink */
  trace?: PerformanceTraceSink;
  /** 可选的领域中立 commit participants */
  participants?: ReadonlyArray<RuntimeCommitParticipantToken>;
}>;

/** 原子发布 revision、Source Snapshot 与 Computation artifact 的同步 runtime */
export type Runtime = Readonly<{
  /** 返回当前已发布 revision */
  revision: () => RuntimeRevision;
  /** 同步准备并原子发布一次完整 update */
  update: (update: RuntimeUpdate) => RuntimeResult;
  /** 读取 Source 在当前 revision 的 immutable Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 读取 Computation 在当前 revision 的 public artifact Snapshot */
  artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  /** 读取 participant 在当前 revision 的 committed public read */
  participant: <TRead>(participant: RuntimeCommitParticipant<TRead>) => TRead;
  /** 返回并清空累计 diagnostics */
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  /** 反向释放 committed participant、Computation artifact 与 Source value；失败 participant 可重复调用重试 */
  dispose: () => void;
}>;
