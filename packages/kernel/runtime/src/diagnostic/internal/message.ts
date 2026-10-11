/** 提取外部异常的可读信息，无法安全读取或转换时返回稳定说明 */
export const getRuntimeDiagnosticMessage = (cause: unknown): string => {
  try {
    return cause instanceof Error ? String(cause.message) : String(cause);
  } catch {
    return 'Runtime callback failed without a readable message';
  }
};
