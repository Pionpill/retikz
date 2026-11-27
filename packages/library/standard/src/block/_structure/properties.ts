/** 在生成下层 IR 时只应用已定义属性；复合属性由调用方按契约单独合并 */
export const mergeBlockProperties = <T extends object>(defaults: T, overrides?: Partial<T>): T => {
  const properties = { ...defaults };
  if (overrides !== undefined) {
    for (const key in overrides) {
      const property = overrides[key];
      if (property !== undefined) properties[key] = property;
    }
  }
  return properties;
};
