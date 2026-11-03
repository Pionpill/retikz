import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { registerFatalProbeError } from '../../resolve';

/** 创建 Core compile transaction 内部不可能状态错误 */
export const createCompileInvariantError = (message: string, options?: ErrorOptions): RetikzCoreError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.CompileInvariantViolation,
    message,
    details: Object.freeze({}),
    cause: options?.cause,
  });
  registerFatalProbeError(error);

  return error;
};
