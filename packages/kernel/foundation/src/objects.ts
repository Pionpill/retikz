import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

/**
 * 属性浅合并的写入策略
 *
 * @template T 被合并的对象类型
 */
export type MergePropertiesOptions<T extends object> = Readonly<{
  /** 决定源属性是否参与写入；首次写入也调用，返回 false 时保留已有值
   * @default undefined
   */
  shouldOverride?: (value: T[keyof T], key: PropertyKey) => boolean;
}>;

/**
 * 从左到右浅合并对象的自身可枚举属性，返回新对象
 * @description 包含字符串与 symbol 键，跳过 undefined 源；默认保留所有属性值，不递归合并或修改输入
 * @param sources 按优先级从低到高排列的源对象
 * @param options 属性写入策略；默认 {}，不筛除源属性
 * @returns 可能经过过滤的新对象，因此返回类型为 `Partial<T>`
 * @throws 属性读取或策略回调失败时抛出 RetikzFoundationError，原始异常保留为 cause
 * @template T 被浅合并的对象类型
 */
export const mergeProperties = <T extends object>(
  sources: ReadonlyArray<Readonly<T> | undefined>,
  options: MergePropertiesOptions<NoInfer<T>> = {},
): Partial<T> => {
  const merged: Partial<T> = {};
  try {
    for (const source of sources) {
      if (source === undefined) continue;
      for (const key of Reflect.ownKeys(source)) {
        if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
        const value = source[key as keyof T];
        if (options.shouldOverride !== undefined && !options.shouldOverride(value, key)) continue;
        Object.defineProperty(merged, key, { value, enumerable: true, configurable: true, writable: true });
      }
    }
  } catch (cause) {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Default,
      message: 'Failed to merge object properties.',
      details: {},
      cause,
    });
  }
  return merged;
};
