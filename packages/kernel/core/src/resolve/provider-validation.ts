import { createCompositeContractError, isCompositeContractError, isFatalProbeError } from './diagnostics';

/**
 * 执行扩展输出校验，将失败归为必须中止布局试算的契约错误
 * @template T 校验成功时原样返回的结果类型
 */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T => {
  try {
    return validate();
  } catch (cause) {
    if (isCompositeContractError(cause) || isFatalProbeError(cause)) throw cause;
    throw createCompositeContractError(`${owner} output validation failed.`, { cause });
  }
};
