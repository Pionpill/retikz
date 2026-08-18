import { RetikzError } from '@retikz/foundation';

import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeProgramId } from '../identity';
import type { RetikzRuntimeOwnerErrorCode } from './constants';
import type {
  RetikzRuntimeErrorCodeValue,
  RetikzRuntimeOwnerErrorCodeValue,
  RuntimeOwnerLifecycleDiagnostic,
  RuntimeOwnerPhaseValue,
} from './types';

import { RetikzRuntimeErrorCode } from './constants';

type RuntimeOwnerLifecycleErrorCode = Extract<
  RetikzRuntimeOwnerErrorCodeValue,
  | typeof RetikzRuntimeOwnerErrorCode.CaptureFailed
  | typeof RetikzRuntimeOwnerErrorCode.CollectIdentitiesFailed
  | typeof RetikzRuntimeOwnerErrorCode.ReadFailed
  | typeof RetikzRuntimeOwnerErrorCode.CompareFailed
  | typeof RetikzRuntimeOwnerErrorCode.ChangeSetValidationFailed
>;

type RetikzRuntimeOwnerRegistryErrorCode = Extract<
  RetikzRuntimeOwnerErrorCodeValue,
  | typeof RetikzRuntimeOwnerErrorCode.Duplicate
  | typeof RetikzRuntimeOwnerErrorCode.Unknown
  | typeof RetikzRuntimeOwnerErrorCode.TokenInvalid
>;

type RetikzRuntimeErrorDetails = Readonly<{
  phase: string;
  owner?: string;
  program?: RuntimeProgramId;
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}>;

type RetikzRuntimeOwnerErrorDetails = Readonly<{
  owner: string;
  phase: RuntimeOwnerPhaseValue;
  diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
}>;

/** Runtime 公共契约或 transaction 失败的结构化错误 */
export class RetikzRuntimeError extends RetikzError<RetikzRuntimeErrorCodeValue, RetikzRuntimeErrorDetails> {
  /** 稳定错误分类 */
  readonly code: RetikzRuntimeErrorCodeValue;
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
    code: RetikzRuntimeErrorCodeValue;
    phase: string;
    message?: string;
    cause?: unknown;
    owner?: string;
    program?: RuntimeProgramId;
    diagnostics?: ReadonlyArray<RuntimeDiagnostic>;
  }) {
    const diagnostics = Object.freeze([...(input.diagnostics ?? [])]);
    const details = {
      phase: input.phase,
      ...(input.owner === undefined ? {} : { owner: input.owner }),
      ...(input.program === undefined ? {} : { program: input.program }),
      diagnostics,
    };
    super({
      code: input.code,
      message: input.message ?? `${input.code}: Runtime failed during ${input.phase}`,
      details,
      cause: input.cause,
    });
    this.name = 'RetikzRuntimeError';
    this.code = input.code;
    this.phase = input.phase;
    this.cause = input.cause;
    this.owner = input.owner;
    this.program = input.program;
    this.diagnostics = diagnostics;
  }
}

/** owner lifecycle callback 失败的稳定错误 */
export class RetikzRuntimeOwnerError extends RetikzError<
  RuntimeOwnerLifecycleErrorCode,
  RetikzRuntimeOwnerErrorDetails
> {
  /** 稳定错误分类 */
  readonly code: RuntimeOwnerLifecycleErrorCode;
  /** 发生失败的 owner */
  readonly owner: string;
  /** 发生失败的 lifecycle 阶段 */
  readonly phase: RuntimeOwnerPhaseValue;
  /** 原始错误 */
  override readonly cause: unknown;
  /** 清理过程中隔离的 secondary diagnostics */
  readonly diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;

  /** 创建包含 owner、phase 与 secondary diagnostics 的 lifecycle 错误 */
  constructor(input: {
    code: RuntimeOwnerLifecycleErrorCode;
    owner: string;
    phase: RuntimeOwnerPhaseValue;
    cause: unknown;
    diagnostics?: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
  }) {
    const diagnostics = Object.freeze([...(input.diagnostics ?? [])]);
    super({
      code: input.code,
      message: `${input.code}: owner "${input.owner}" failed during ${input.phase}`,
      details: { owner: input.owner, phase: input.phase, diagnostics },
      cause: input.cause,
    });
    this.name = 'RetikzRuntimeOwnerError';
    this.code = input.code;
    this.owner = input.owner;
    this.phase = input.phase;
    this.cause = input.cause;
    this.diagnostics = diagnostics;
  }
}

/** owner registry token 或 key 违反契约时的稳定错误 */
export class RetikzRuntimeOwnerRegistryError extends RetikzError<
  RetikzRuntimeOwnerRegistryErrorCode,
  Readonly<{ owner: string }>
> {
  /** 稳定错误分类 */
  readonly code: RetikzRuntimeOwnerRegistryErrorCode;
  /** 关联的 owner key */
  readonly owner: string;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 registry contract 错误 */
  constructor(code: RetikzRuntimeOwnerRegistryErrorCode, owner: string, cause?: unknown) {
    super({
      code,
      message: `${code}: invalid runtime owner "${owner}"`,
      details: { owner },
      cause,
    });
    this.name = 'RetikzRuntimeOwnerRegistryError';
    this.code = code;
    this.owner = owner;
    this.cause = cause;
  }
}

/** Runtime identity 结构或 owner 约束无效时的稳定错误 */
export class RetikzRuntimeIdentityError extends RetikzError<
  typeof RetikzRuntimeErrorCode.IdentityInvalid,
  Readonly<{ owner: string }>
> {
  /** identity 的稳定错误分类 */
  readonly code = RetikzRuntimeErrorCode.IdentityInvalid;
  /** 关联的 owner 值 */
  readonly owner: string;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 identity contract 错误 */
  constructor(owner: string, cause?: unknown) {
    super({
      code: RetikzRuntimeErrorCode.IdentityInvalid,
      message: `${RetikzRuntimeErrorCode.IdentityInvalid}: invalid runtime identity for owner "${owner}"`,
      details: { owner },
      cause,
    });
    this.name = 'RetikzRuntimeIdentityError';
    this.owner = owner;
    this.cause = cause;
  }
}
