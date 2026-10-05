import type { ValueOf } from '@retikz/foundation';
/** Runtime Source 生命周期阶段 */
export const RuntimeSourcePhase = {
  /** Source value capture 阶段 */
  Capture: 'capture',
  /** Source identity 收集阶段 */
  CollectIdentities: 'collect-identities',
  /** Source read 阶段 */
  Read: 'read',
  /** Source value 比较阶段 */
  Compare: 'compare',
  /** change set 校验阶段 */
  ValidateChangeSet: 'validate-change-set',
  /** Source value retire 阶段 */
  Retire: 'retire',
} as const;

/** Runtime transaction、Computation、registry、Source 与 participant 的稳定错误码 */
export const RetikzRuntimeErrorCode = {
  /** Source definition 重复 */
  Duplicate: 'RUNTIME_SOURCE_DUPLICATE',
  /** Source 不存在 */
  Unknown: 'RUNTIME_SOURCE_UNKNOWN',
  /** Source token 无效 */
  TokenInvalid: 'RUNTIME_SOURCE_TOKEN_INVALID',
  /** identity 无效 */
  IdentityInvalid: 'RUNTIME_IDENTITY_INVALID',
  /** Source capture 失败 */
  CaptureFailed: 'RUNTIME_SOURCE_CAPTURE_FAILED',
  /** Source identity 收集失败 */
  CollectIdentitiesFailed: 'RUNTIME_SOURCE_COLLECT_IDENTITIES_FAILED',
  /** Source read 失败 */
  ReadFailed: 'RUNTIME_SOURCE_READ_FAILED',
  /** Source compare 失败 */
  CompareFailed: 'RUNTIME_SOURCE_COMPARE_FAILED',
  /** Source change set 校验失败 */
  ChangeSetValidationFailed: 'RUNTIME_SOURCE_CHANGESET_VALIDATION_FAILED',
  /** Runtime 内部不变量被破坏 */
  InternalInvariant: 'RUNTIME_INTERNAL_INVARIANT',
  /** Computation identity 无效 */
  ComputationIdInvalid: 'RUNTIME_COMPUTATION_ID_INVALID',
  /** Computation definition 重复 */
  ComputationDuplicate: 'RUNTIME_COMPUTATION_DUPLICATE',
  /** Computation 不存在 */
  ComputationUnknown: 'RUNTIME_COMPUTATION_UNKNOWN',
  /** Computation token 无效 */
  ComputationTokenInvalid: 'RUNTIME_COMPUTATION_TOKEN_INVALID',
  /** Computation graph 存在环 */
  ComputationCycle: 'RUNTIME_COMPUTATION_CYCLE',
  /** trace definition 无效 */
  TraceDefinitionInvalid: 'RUNTIME_TRACE_DEFINITION_INVALID',
  /** registry 不匹配 */
  RegistryMismatch: 'RUNTIME_REGISTRY_MISMATCH',
  /** update strategy 无效 */
  UpdateStrategyInvalid: 'RUNTIME_UPDATE_STRATEGY_INVALID',
  /** initial Source 不匹配 */
  InitialSourceMismatch: 'RUNTIME_INITIAL_SOURCE_MISMATCH',
  /** revision 已过期 */
  RevisionStale: 'RUNTIME_REVISION_STALE',
  /** revision 已耗尽 */
  RevisionExhausted: 'RUNTIME_REVISION_EXHAUSTED',
  /** change set base revision 不匹配 */
  ChangeSetRevisionMismatch: 'RUNTIME_CHANGESET_REVISION_MISMATCH',
  /** Computation 使用了未声明依赖 */
  UndeclaredDependency: 'RUNTIME_UNDECLARED_DEPENDENCY',
  /** Computation full 执行失败 */
  ComputationRunFailed: 'RUNTIME_COMPUTATION_RUN_FAILED',
  /** Computation update 执行失败 */
  ComputationUpdateFailed: 'RUNTIME_COMPUTATION_UPDATE_FAILED',
  /** artifact capture 失败 */
  ArtifactCaptureFailed: 'RUNTIME_ARTIFACT_CAPTURE_FAILED',
  /** artifact private read 失败 */
  ArtifactComputationReadFailed: 'RUNTIME_ARTIFACT_COMPUTATION_READ_FAILED',
  /** artifact public read 失败 */
  ArtifactPublicReadFailed: 'RUNTIME_ARTIFACT_PUBLIC_READ_FAILED',
  /** Source value ownership alias */
  SourceOwnershipAlias: 'RUNTIME_SOURCE_OWNERSHIP_ALIAS',
  /** artifact ownership alias */
  ArtifactOwnershipAlias: 'RUNTIME_ARTIFACT_OWNERSHIP_ALIAS',
  /** runtime 重入 */
  Reentrant: 'RUNTIME_REENTRANT',
  /** runtime 已释放 */
  Disposed: 'RUNTIME_DISPOSED',
  /** revision 无效 */
  RevisionInvalid: 'RUNTIME_REVISION_INVALID',
  /** change set 无效 */
  ChangeSetInvalid: 'RUNTIME_CHANGESET_INVALID',
  /** Source command 无效 */
  SourceCommandInvalid: 'RUNTIME_SOURCE_COMMAND_INVALID',
  /** participant token 无效 */
  ParticipantTokenInvalid: 'RUNTIME_PARTICIPANT_TOKEN_INVALID',
  /** participant definition 重复 */
  ParticipantDuplicate: 'RUNTIME_PARTICIPANT_DUPLICATE',
  /** participant dependency 无效 */
  ParticipantDependencyInvalid: 'RUNTIME_PARTICIPANT_DEPENDENCY_INVALID',
  /** participant 不存在 */
  ParticipantUnknown: 'RUNTIME_PARTICIPANT_UNKNOWN',
  /** participant 已被占用 */
  ParticipantAlreadyOwned: 'RUNTIME_PARTICIPANT_ALREADY_OWNED',
  /** participant prepare 失败 */
  ParticipantPrepareFailed: 'RUNTIME_PARTICIPANT_PREPARE_FAILED',
  /** participant commit 失败 */
  ParticipantCommitFailed: 'RUNTIME_PARTICIPANT_COMMIT_FAILED',
  /** participant read 失败 */
  ParticipantReadFailed: 'RUNTIME_PARTICIPANT_READ_FAILED',
  /** participant rollback 失败 */
  ParticipantRollbackFailed: 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
  /** participant token dispose 失败 */
  ParticipantTokenDisposeFailed: 'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED',
  /** participant dispose 失败 */
  ParticipantDisposeFailed: 'RUNTIME_PARTICIPANT_DISPOSE_FAILED',
} as const;

/** Runtime Source 执行阶段 */
export type RuntimeSourcePhase = ValueOf<typeof RuntimeSourcePhase>;

/** Runtime transaction、Computation 与 registry 的稳定错误分类 */
export type RetikzRuntimeErrorCode = ValueOf<typeof RetikzRuntimeErrorCode>;
