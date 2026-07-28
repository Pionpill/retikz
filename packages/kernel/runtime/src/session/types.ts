import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeOwnerDefinition, RuntimeRevision } from '../owner';
import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../participant';
import type { RuntimeProgramDefinition } from '../program';
import type { RuntimeOwnerRegistry, RuntimeProgramRegistry } from '../registry';
import type { PerformanceTraceSink } from '../trace';
import type { RuntimeOwnerInput, RuntimeSessionResult, RuntimeSessionUpdate, RuntimeSnapshot } from '../transaction';

/** 同步 Runtime session 的创建配置 */
export type RuntimeSessionOptions = Readonly<{
  /** session state 所属的 owner registry */
  owners: RuntimeOwnerRegistry;
  /** 与同一 owner registry 绑定的 Program registry */
  programs: RuntimeProgramRegistry;
  /** 精确覆盖 owner registry 的初始完整 Snapshot commands */
  initialSnapshots: ReadonlyArray<RuntimeOwnerInput>;
  /** 可选性能 trace sink */
  trace?: PerformanceTraceSink;
  /** 可选的领域中立 commit participants */
  participants?: ReadonlyArray<RuntimeCommitParticipantToken>;
}>;

/** 原子发布 revision、owner Snapshot 与 Program artifact 的同步 session */
export type RuntimeSession = Readonly<{
  /** 返回当前已发布 revision */
  revision: () => RuntimeRevision;
  /** 同步准备并原子发布一次完整 update */
  update: (update: RuntimeSessionUpdate) => RuntimeSessionResult;
  /** 读取 owner 在当前 revision 的 immutable Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 读取 Program 在当前 revision 的 public artifact Snapshot */
  artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  /** 读取 participant 在当前 revision 的 committed public read */
  participant: <TRead>(participant: RuntimeCommitParticipant<TRead>) => TRead;
  /** 返回并清空累计 diagnostics */
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  /** 释放所有 committed owner value 与 Program artifact */
  dispose: () => void;
}>;
