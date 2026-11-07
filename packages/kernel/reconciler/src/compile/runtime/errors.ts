import { registerFatalProbeError } from '@retikz/core';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';

/** 创建不可被布局试编译恢复的执行器内部不变量错误 */
export const createExecutionInvariantError = (message: string, options?: ErrorOptions): RetikzReconcilerError => {
  const error = new RetikzReconcilerError({
    code: RetikzReconcilerErrorCode.Compile,
    message,
    cause: options?.cause,
  });
  registerFatalProbeError(error);
  return error;
};
