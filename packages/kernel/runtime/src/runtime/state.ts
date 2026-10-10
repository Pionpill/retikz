import type {
  RuntimeComputationErasedExecutor,
  RuntimeComputationToken,
  RuntimePreparedComputationResult,
} from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimePreparedCommit } from '../participant';
import type { RuntimePreparedSourceValue } from '../source';
import type { RuntimeSourceCommandExecutor } from '../transaction';

/** Runtime 持有的 Source command 与已准备值 */
export type RuntimeSourceState = Readonly<{
  /** 用于候选读取与资源退休的 Source command */
  command: RuntimeSourceCommandExecutor;
  /** Runtime 已接管的 Source 值与只读视图 */
  prepared: RuntimePreparedSourceValue<unknown, unknown>;
}>;

/** Runtime 持有的 Computation executor 与已准备结果 */
export type RuntimeComputationState = Readonly<{
  /** 产生此结果的 Computation token */
  definition: RuntimeComputationToken;
  /** 捕获结果、读取与释放的执行入口 */
  executor: RuntimeComputationErasedExecutor;
  /** Runtime 已接管的计算结果与两层只读视图 */
  prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>;
}>;

/** 单次 participant 提交及其诊断读取入口 */
export type RuntimePreparedParticipantState = Readonly<{
  /** 本轮可回滚的提交对象 */
  prepared: RuntimePreparedCommit;
  /** 消费该参与者本轮尚未读取的诊断 */
  takeDiagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
}>;
