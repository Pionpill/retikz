import type { RuntimeComputationDefinition } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../participant';
import type { RuntimeSourceRegistry, RuntimeComputationRegistry } from '../registry';
import type { RuntimeSourceDefinition, RuntimeRevision } from '../source';
import type { PerformanceTraceSink } from '../trace';
import type { RuntimeSourceInput, RuntimeResult, RuntimeUpdate, RuntimeSnapshot } from '../transaction';
import type { RuntimeUpdateStrategy } from './constants';

/** 同步 Runtime 的创建配置，创建后固定注册表、更新策略与 trace 引用 */
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

/** 原子发布 revision、Source Snapshot 与 Computation result 的同步 runtime */
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
   * @template TChange 领域变更提示的单项类型，由消费它的计算校验并用于增量处理
   */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /**
   * 读取 Computation 在当前 revision 的 public result Snapshot
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  result: <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  /**
   * 读取 participant 在当前 revision 的 committed public read
   * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
   */
  participant: <TRead>(participant: RuntimeCommitParticipant<TRead>) => TRead;
  /** 返回并清空累计 diagnostics */
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  /** 反向释放 committed participant、Computation result 与 Source value；失败 participant 可重复调用重试 */
  dispose: () => void;
}>;
