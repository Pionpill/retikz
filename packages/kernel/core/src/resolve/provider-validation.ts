import { CompositeContractError, isCompositeContractError, isFatalProbeError } from './diagnostics';

/** 将 provider 输出校验失败统一归类为 fatal contract error */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T => {
  try {
    return validate();
  } catch (cause) {
    if (isCompositeContractError(cause) || isFatalProbeError(cause)) throw cause;
    throw new CompositeContractError(`${owner} output validation failed.`, { cause });
  }
};
