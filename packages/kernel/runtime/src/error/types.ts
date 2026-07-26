/** Runtime owner 执行阶段 */
export type RuntimeOwnerPhase =
  | 'capture'
  | 'collect-identities'
  | 'read'
  | 'compare'
  | 'validate-change-set'
  | 'retire';

/** Runtime owner 的稳定错误分类 */
export type RuntimeOwnerErrorCode =
  | 'RUNTIME_OWNER_DUPLICATE'
  | 'RUNTIME_OWNER_UNKNOWN'
  | 'RUNTIME_OWNER_TOKEN_INVALID'
  | 'RUNTIME_IDENTITY_INVALID'
  | 'RUNTIME_OWNER_CAPTURE_FAILED'
  | 'RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED'
  | 'RUNTIME_OWNER_READ_FAILED'
  | 'RUNTIME_OWNER_COMPARE_FAILED'
  | 'RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED';

/** Runtime owner value 释放失败的非致命诊断 */
export type RuntimeOwnerLifecycleDiagnostic = Readonly<{
  /** 诊断分类 */
  code: 'RUNTIME_OWNER_DISPOSE_FAILED';
  /** 发生失败的 owner */
  owner: string;
  /** 释放阶段 */
  phase: 'retire';
  /** 可读错误信息 */
  message: string;
  /** 原始错误 */
  cause: unknown;
}>;

/** owner executor 的成功结果与非致命诊断 */
export type RuntimeOwnerExecutionResult<T> = Readonly<{
  /** 成功产物 */
  value: T;
  /** 执行过程中隔离的非致命诊断 */
  diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
}>;
