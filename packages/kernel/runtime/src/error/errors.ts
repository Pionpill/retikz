import { RetikzError } from '@retikz/foundation';

import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeComputationId } from '../identity';
import type { RetikzRuntimeErrorCodeValue } from './types';

type RetikzRuntimeErrorDetails = Readonly<{
  phase: string;
  owner?: string;
  computation?: RuntimeComputationId;
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
  /** 可选来源归属，例如 Source key 或 participant key */
  readonly owner?: string;
  /** 可选 Computation context */
  readonly computation?: RuntimeComputationId;
  /** cleanup 等 secondary diagnostics */
  readonly diagnostics: ReadonlyArray<RuntimeDiagnostic>;

  /** 创建保留稳定 code、context 与 secondary diagnostics 的 Runtime 错误 */
  constructor(input: {
    code: RetikzRuntimeErrorCodeValue;
    phase: string;
    message?: string;
    cause?: unknown;
    owner?: string;
    computation?: RuntimeComputationId;
    diagnostics?: ReadonlyArray<RuntimeDiagnostic>;
  }) {
    const diagnostics = Object.freeze([...(input.diagnostics ?? [])]);
    const details = {
      phase: input.phase,
      ...(input.owner === undefined ? {} : { owner: input.owner }),
      ...(input.computation === undefined ? {} : { computation: input.computation }),
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
    this.computation = input.computation;
    this.diagnostics = diagnostics;
  }
}
