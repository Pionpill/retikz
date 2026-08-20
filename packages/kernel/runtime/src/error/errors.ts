import { RetikzError } from '@retikz/foundation';

import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeProgramId } from '../identity';
import type { RetikzRuntimeErrorCodeValue } from './types';

type RetikzRuntimeErrorDetails = Readonly<{
  phase: string;
  owner?: string;
  program?: RuntimeProgramId;
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
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
