/** 从 JSON 候选结构中递归移除显式 `undefined` 对象属性 */
export const stripUndefinedProperties = <T extends Record<string, unknown>>(value: T): T => {
  const stripValue = (nestedValue: unknown): unknown => {
    if (Array.isArray(nestedValue)) return nestedValue.map(stripValue);
    if (nestedValue === null || typeof nestedValue !== 'object') return nestedValue;

    const stripped: Record<string, unknown> = {};
    for (const [key, propertyValue] of Object.entries(nestedValue)) {
      if (propertyValue !== undefined) stripped[key] = stripValue(propertyValue);
    }
    return stripped;
  };

  return stripValue(value) as T;
};

/** 仅清理对象输入的显式 `undefined` 属性，非对象值保持原样 */
export const stripUndefinedObjectProperties = (value: unknown): unknown =>
  value !== null && !Array.isArray(value) && typeof value === 'object'
    ? stripUndefinedProperties(value as Record<string, unknown>)
    : value;
