/** 从 schema 输出中递归移除 JSON 不可表达的显式 undefined 对象属性 */
export const omitUndefinedProperties = <T extends Record<string, unknown>>(value: T): T => {
  const normalizeValue = (nestedValue: unknown): unknown => {
    if (Array.isArray(nestedValue)) return nestedValue.map(normalizeValue);
    if (nestedValue === null || typeof nestedValue !== 'object') return nestedValue;

    const normalized: Record<string, unknown> = {};
    for (const [key, propertyValue] of Object.entries(nestedValue)) {
      if (propertyValue !== undefined) normalized[key] = normalizeValue(propertyValue);
    }
    return normalized;
  };

  return normalizeValue(value) as T;
};

/** 在 schema 解析前规范化对象输入，非对象值保持原样交给原 schema 诊断 */
export const normalizeUndefinedObjectInput = (value: unknown): unknown =>
  value !== null && !Array.isArray(value) && typeof value === 'object'
    ? omitUndefinedProperties(value as Record<string, unknown>)
    : value;
