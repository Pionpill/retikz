import type { ReconcilerCommitTarget } from '@retikz/reconciler';

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
export type ProcessingTransactionParticipantFactory = () => ProcessingTransactionParticipant;
