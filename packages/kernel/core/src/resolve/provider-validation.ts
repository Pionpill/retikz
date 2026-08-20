import { createCompositeContractError, isCompositeContractError, isFatalProbeError } from './diagnostics';

/** 将 provider 输出校验失败统一归类为 fatal contract error */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T => {
  try {
    return validate();
  } catch (cause) {
    if (isCompositeContractError(cause) || isFatalProbeError(cause)) throw cause;
    throw createCompositeContractError(`${owner} output validation failed.`, { cause });
  }
};
