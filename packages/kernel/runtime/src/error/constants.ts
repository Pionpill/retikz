/** Runtime owner 生命周期阶段 */
export const RuntimeOwnerPhase = {
  /** owner value capture 阶段 */
  Capture: 'capture',
  /** owner identity 收集阶段 */
  CollectIdentities: 'collect-identities',
  /** owner read 阶段 */
  Read: 'read',
  /** owner value 比较阶段 */
  Compare: 'compare',
  /** change set 校验阶段 */
  ValidateChangeSet: 'validate-change-set',
  /** owner value retire 阶段 */
  Retire: 'retire',
} as const;

/** Runtime owner 的稳定错误码 */
export const RetikzRuntimeOwnerErrorCode = {
  /** owner definition 重复 */
  Duplicate: 'RUNTIME_OWNER_DUPLICATE',
  /** owner 不存在 */
  Unknown: 'RUNTIME_OWNER_UNKNOWN',
  /** owner token 无效 */
  TokenInvalid: 'RUNTIME_OWNER_TOKEN_INVALID',
  /** identity 无效 */
  IdentityInvalid: 'RUNTIME_IDENTITY_INVALID',
  /** owner capture 失败 */
  CaptureFailed: 'RUNTIME_OWNER_CAPTURE_FAILED',
  /** owner identity 收集失败 */
  CollectIdentitiesFailed: 'RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED',
  /** owner read 失败 */
  ReadFailed: 'RUNTIME_OWNER_READ_FAILED',
  /** owner compare 失败 */
  CompareFailed: 'RUNTIME_OWNER_COMPARE_FAILED',
  /** owner change set 校验失败 */
  ChangeSetValidationFailed: 'RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED',
} as const;

/** Runtime transaction、Program、registry 与 participant 的稳定错误码 */
export const RetikzRuntimeErrorCode = {
  ...RetikzRuntimeOwnerErrorCode,
  /** Runtime 内部不变量被破坏 */
  InternalInvariant: 'RUNTIME_INTERNAL_INVARIANT',
  /** Program identity 无效 */
  ProgramIdInvalid: 'RUNTIME_PROGRAM_ID_INVALID',
  /** Program definition 重复 */
  ProgramDuplicate: 'RUNTIME_PROGRAM_DUPLICATE',
  /** Program 不存在 */
  ProgramUnknown: 'RUNTIME_PROGRAM_UNKNOWN',
  /** Program token 无效 */
  ProgramTokenInvalid: 'RUNTIME_PROGRAM_TOKEN_INVALID',
  /** Program graph 存在环 */
  ProgramCycle: 'RUNTIME_PROGRAM_CYCLE',
  /** trace definition 无效 */
  TraceDefinitionInvalid: 'RUNTIME_TRACE_DEFINITION_INVALID',
  /** registry 不匹配 */
  RegistryMismatch: 'RUNTIME_REGISTRY_MISMATCH',
  /** update strategy 无效 */
  UpdateStrategyInvalid: 'RUNTIME_UPDATE_STRATEGY_INVALID',
  /** initial owner 不匹配 */
  InitialOwnerMismatch: 'RUNTIME_INITIAL_OWNER_MISMATCH',
  /** revision 已过期 */
  RevisionStale: 'RUNTIME_REVISION_STALE',
  /** revision 已耗尽 */
  RevisionExhausted: 'RUNTIME_REVISION_EXHAUSTED',
  /** change set base revision 不匹配 */
  ChangeSetRevisionMismatch: 'RUNTIME_CHANGESET_REVISION_MISMATCH',
  /** Program 使用了未声明依赖 */
  UndeclaredDependency: 'RUNTIME_UNDECLARED_DEPENDENCY',
  /** Program full 执行失败 */
  ProgramRunFailed: 'RUNTIME_PROGRAM_RUN_FAILED',
  /** Program update 执行失败 */
  ProgramUpdateFailed: 'RUNTIME_PROGRAM_UPDATE_FAILED',
  /** artifact capture 失败 */
  ArtifactCaptureFailed: 'RUNTIME_ARTIFACT_CAPTURE_FAILED',
  /** artifact private read 失败 */
  ArtifactProgramReadFailed: 'RUNTIME_ARTIFACT_PROGRAM_READ_FAILED',
  /** artifact public read 失败 */
  ArtifactPublicReadFailed: 'RUNTIME_ARTIFACT_PUBLIC_READ_FAILED',
  /** owner value ownership alias */
  OwnerOwnershipAlias: 'RUNTIME_OWNER_OWNERSHIP_ALIAS',
  /** artifact ownership alias */
  ArtifactOwnershipAlias: 'RUNTIME_ARTIFACT_OWNERSHIP_ALIAS',
  /** session 重入 */
  SessionReentrant: 'RUNTIME_SESSION_REENTRANT',
  /** session 已释放 */
  SessionDisposed: 'RUNTIME_SESSION_DISPOSED',
  /** revision 无效 */
  RevisionInvalid: 'RUNTIME_REVISION_INVALID',
  /** change set 无效 */
  ChangeSetInvalid: 'RUNTIME_CHANGESET_INVALID',
  /** owner command 无效 */
  OwnerCommandInvalid: 'RUNTIME_OWNER_COMMAND_INVALID',
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
