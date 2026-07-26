import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeProgramId } from '../identity';
import type {
  RuntimeErrorCode,
  RuntimeOwnerErrorCode,
  RuntimeOwnerLifecycleDiagnostic,
  RuntimeOwnerPhase,
} from './types';

type RuntimeOwnerLifecycleErrorCode = Extract<
  RuntimeOwnerErrorCode,
  | 'RUNTIME_OWNER_CAPTURE_FAILED'
  | 'RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED'
  | 'RUNTIME_OWNER_READ_FAILED'
  | 'RUNTIME_OWNER_COMPARE_FAILED'
  | 'RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED'
>;

/** Runtime 公共契约或 transaction 失败的结构化错误 */
export class RuntimeError extends Error {
  /** 稳定错误分类 */
  readonly code: RuntimeErrorCode;
  /** 发生失败的 Runtime 阶段 */
  readonly phase: string;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;
  /** 可选 owner context */
  readonly owner?: string;
  /** 可选 Program context */
  readonly program?: RuntimeProgramId;
  /** cleanup 等 secondary diagnostics */
  readonly diagnostics: ReadonlyArray<RuntimeDiagnostic>;

  /** 创建保留稳定 code、context 与 secondary diagnostics 的 Runtime 错误 */
  constructor(input: {
    code: RuntimeErrorCode;
    phase: string;
    cause?: unknown;
    owner?: string;
    program?: RuntimeProgramId;
    diagnostics?: ReadonlyArray<RuntimeDiagnostic>;
  }) {
    super(`${input.code}: Runtime failed during ${input.phase}`, { cause: input.cause });
    this.name = 'RuntimeError';
    this.code = input.code;
    this.phase = input.phase;
    this.cause = input.cause;
    this.owner = input.owner;
    this.program = input.program;
    this.diagnostics = Object.freeze([...(input.diagnostics ?? [])]);
  }
}

/** owner lifecycle callback 失败的稳定错误 */
export class RuntimeOwnerError extends Error {
  /** 稳定错误分类 */
  readonly code: RuntimeOwnerLifecycleErrorCode;
  /** 发生失败的 owner */
  readonly owner: string;
  /** 发生失败的 lifecycle 阶段 */
  readonly phase: RuntimeOwnerPhase;
  /** 原始错误 */
  override readonly cause: unknown;
  /** 清理过程中隔离的 secondary diagnostics */
  readonly diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;

  /** 创建包含 owner、phase 与 secondary diagnostics 的 lifecycle 错误 */
  constructor(input: {
    code: RuntimeOwnerLifecycleErrorCode;
    owner: string;
    phase: RuntimeOwnerPhase;
    cause: unknown;
    diagnostics?: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
  }) {
    super(`${input.code}: owner "${input.owner}" failed during ${input.phase}`, { cause: input.cause });
    this.name = 'RuntimeOwnerError';
    this.code = input.code;
    this.owner = input.owner;
    this.phase = input.phase;
    this.cause = input.cause;
    this.diagnostics = Object.freeze([...(input.diagnostics ?? [])]);
  }
}

/** owner registry token 或 key 违反契约时的稳定错误 */
export class RuntimeOwnerRegistryError extends Error {
  /** 稳定错误分类 */
  readonly code: Extract<
    RuntimeOwnerErrorCode,
    'RUNTIME_OWNER_DUPLICATE' | 'RUNTIME_OWNER_UNKNOWN' | 'RUNTIME_OWNER_TOKEN_INVALID'
  >;
  /** 关联的 owner key */
  readonly owner: string;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 registry contract 错误 */
  constructor(code: RuntimeOwnerRegistryError['code'], owner: string, cause?: unknown) {
    super(`${code}: invalid runtime owner "${owner}"`, { cause });
    this.name = 'RuntimeOwnerRegistryError';
    this.code = code;
    this.owner = owner;
    this.cause = cause;
  }
}

/** Runtime identity 结构或 owner 约束无效时的稳定错误 */
export class RuntimeIdentityError extends Error {
  /** identity 的稳定错误分类 */
  readonly code = 'RUNTIME_IDENTITY_INVALID' as const;
  /** 关联的 owner 值 */
  readonly owner: string;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 identity contract 错误 */
  constructor(owner: string, cause?: unknown) {
    super(`RUNTIME_IDENTITY_INVALID: invalid runtime identity for owner "${owner}"`, { cause });
    this.name = 'RuntimeIdentityError';
    this.owner = owner;
    this.cause = cause;
  }
}
