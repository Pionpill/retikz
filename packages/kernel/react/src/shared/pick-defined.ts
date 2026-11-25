/**
 * 从源对象按字段表拣出 defined 字段
 * @description 只透传 `!== undefined` 的字段；调用方与特化字段合并成完整目标对象
 * @template TSource 待提取字段的源对象类型
 * @template TKey 允许提取的源对象键，决定结果保留的字段范围
 * @returns 新对象，仅包含指定键中值不为 undefined 的字段
 */
export const pickDefined = <TSource extends object, TKey extends keyof TSource>(
  source: TSource,
  fields: ReadonlyArray<TKey>,
): Partial<Pick<TSource, TKey>> => {
  const out: Partial<Pick<TSource, TKey>> = {};

  for (const key of fields) {
    if (source[key] !== undefined) out[key] = source[key];
  }

  return out;
};
