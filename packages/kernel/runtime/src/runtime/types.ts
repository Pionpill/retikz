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
  /**
   * 读取 Source 在当前 revision 的 immutable Snapshot
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /**
   * 读取 Computation 在当前 revision 的 public artifact Snapshot
   * @template TArtifactInput run 或 update 产生、交给 artifact capture 的产物输入类型
   * @template TArtifact capture 产生并由运行时持有和释放的计算产物类型
   * @template TComputationRead 仅供当前计算的 update 读取旧产物的私有视图类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开产物视图类型
   */
  artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  /**
   * 读取 participant 在当前 revision 的 committed public read
   * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
   */
  participant: <TRead>(participant: RuntimeCommitParticipant<TRead>) => TRead;
  /** 返回并清空累计 diagnostics */
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  /** 反向释放 committed participant、Computation artifact 与 Source value；失败 participant 可重复调用重试 */
  dispose: () => void;
}>;
