import type { ValueOf } from '@retikz/foundation';

/** Runtime 内置结构化诊断码 */
export const RuntimeDiagnosticCode = {
  /** change set 触发 full fallback */
  ChangeSetFallback: 'RUNTIME_CHANGESET_FALLBACK',
  /** Source value 释放失败 */
  SourceDisposeFailed: 'RUNTIME_SOURCE_DISPOSE_FAILED',
  /** result 释放失败 */
  ResultDisposeFailed: 'RUNTIME_RESULT_DISPOSE_FAILED',
  /** Computation commit observer 失败 */
  ComputationObserverFailed: 'RUNTIME_COMPUTATION_OBSERVER_FAILED',
  /** trace record 无效 */
  TraceInvalidRecord: 'RUNTIME_TRACE_INVALID_RECORD',
  /** trace sink 回调失败 */
  TraceSinkFailed: 'RUNTIME_TRACE_SINK_FAILED',
  /** trace reporter 重入 */
  TraceReentrant: 'RUNTIME_TRACE_REENTRANT',
  /** participant diagnostic 回调输入无效 */
  ParticipantDiagnosticInvalid: 'RUNTIME_PARTICIPANT_DIAGNOSTIC_INVALID',
  /** participant diagnostic 回调重入 */
  ParticipantDiagnosticReentrant: 'RUNTIME_PARTICIPANT_DIAGNOSTIC_REENTRANT',
} as const;

/** Runtime 结构化诊断的发生阶段 */
export const RuntimeDiagnosticPhase = {
  /** result 捕获阶段 */
  ResultCapture: 'result-capture',
  /** result 释放阶段 */
  ResultDispose: 'result-dispose',
  /** result private read 阶段 */
  ResultComputationRead: 'result-computation-read',
  /** result public read 阶段 */
  ResultPublicRead: 'result-public-read',
  /** result Snapshot 阶段 */
  ResultSnapshot: 'result-snapshot',
  /** candidate result 读取阶段 */
  CandidateResult: 'candidate-result',
  /** candidate change 读取阶段 */
  CandidateChange: 'candidate-change',
  /** candidate Snapshot 读取阶段 */
  CandidateRead: 'candidate-read',
  /** Source value capture 阶段 */
  Capture: 'capture',
  /** change set 处理阶段 */
  ChangeSet: 'change-set',
  /** Source identity 收集阶段 */
  CollectIdentities: 'collect-identities',
  /** Source command 处理阶段 */
  Command: 'command',
  /** Source value 比较阶段 */
  Compare: 'compare',
  /** participant commit 阶段 */
  Commit: 'commit',
  /** 诊断回调阶段 */
  Diagnose: 'diagnose',
  /** Computation commit observer 阶段 */
  Observe: 'observe',
  /** participant 定义阶段 */
  ParticipantDefinition: 'participant-definition',
  /** participant prepare 阶段 */
  Prepare: 'prepare',
  /** Computation 定义阶段 */
  ComputationDefinition: 'computation-definition',
  /** Computation registry 阶段 */
  ComputationRegistry: 'computation-registry',
  /** value read 阶段 */
  Read: 'read',
  /** participant dispose 阶段 */
  ParticipantDispose: 'participant-dispose',
  /** participant token dispose 阶段 */
  TokenDispose: 'token-dispose',
  /** Source value retire 阶段 */
  Retire: 'retire',
  /** revision 校验阶段 */
  Revision: 'revision',
  /** rollback 阶段 */
  Rollback: 'rollback',
  /** Computation full/update 执行阶段 */
  Run: 'run',
  /** Runtime 创建阶段 */
  Create: 'runtime-create',
  /** Snapshot 处理阶段 */
  Snapshot: 'snapshot',
  /** trace 诊断阶段 */
  Trace: 'trace',
  /** update 执行阶段 */
  Update: 'update',
  /** change set 校验阶段 */
  ValidateChangeSet: 'validate-change-set',
} as const;

/** Runtime 内置结构化诊断码取值 */
export type RuntimeDiagnosticCode = ValueOf<typeof RuntimeDiagnosticCode>;

/** Runtime 结构化诊断阶段取值 */
export type RuntimeDiagnosticPhase = ValueOf<typeof RuntimeDiagnosticPhase>;
