import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

/** 属性比较允许展开的容器深度 */
export type ComparePropertiesOptions = Readonly<{
  /**
   * 展开普通对象或数组的最大层数，必须为非负安全整数；0 表示仅使用 Object.is
   * @default 1
   */
  depth?: number;
}>;

/**
 * 在有限深度内比较普通对象与数组的自身可枚举属性
 * @description 省略 options 时展开一层；到达深度上限及其他对象类型按 Object.is 比较。包含字符串与 symbol 键，数组长度和空位参与比较，不比较普通对象的 Object.prototype 与 null 原型差异，不修改输入
 * @remarks 循环引用同样受深度限制，不提供无限递归或循环结构等价判断。访问器在遍历到对应属性时读取，属性顺序不参与比较
 * @throws 深度无效或属性检查、读取失败时抛出 RetikzFoundationError，读取异常保留为 cause
 */
export const compareProperties = (
  previous: unknown,
  current: unknown,
  options: ComparePropertiesOptions = {},
): boolean => {
  const depth = options.depth ?? 1;
  if (!Number.isSafeInteger(depth) || depth < 0) {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Default,
      message: 'Property comparison depth must be a non-negative safe integer.',
      details: { depth },
    });
  }

  /** 仅展开普通对象及原生数组；其他实例保留引用语义 */
  const isContainer = (value: object): boolean => {
    const prototype = Object.getPrototypeOf(value);
    return Array.isArray(value) ? prototype === Array.prototype : prototype === Object.prototype || prototype === null;
  };

  /** 每层消耗一个深度单位，到达边界后不再读取属性 */
  const compare = (left: unknown, right: unknown, remaining: number): boolean => {
    if (Object.is(left, right)) return true;
    if (remaining === 0 || left === null || right === null || typeof left !== 'object' || typeof right !== 'object')
      return false;
    if (!isContainer(left) || !isContainer(right)) return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left) && Array.isArray(right) && left.length !== right.length) return false;

    const keys = Reflect.ownKeys(left).filter(key => Object.prototype.propertyIsEnumerable.call(left, key));
    const rightKeys = Reflect.ownKeys(right).filter(key => Object.prototype.propertyIsEnumerable.call(right, key));
    if (keys.length !== rightKeys.length) return false;
    for (const key of keys) {
      if (!Object.prototype.propertyIsEnumerable.call(right, key)) return false;
      const leftValue: unknown = Reflect.get(left, key);
      const rightValue: unknown = Reflect.get(right, key);
      if (!compare(leftValue, rightValue, remaining - 1)) return false;
    }
    return true;
  };

  try {
    return compare(previous, current, depth);
  } catch (cause) {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Default,
      message: 'Failed to compare object properties.',
      details: {},
      cause,
    });
  }
};

/**
 * 从左到右浅合并非 undefined 属性，返回新对象
 * @description 跳过 undefined 源和属性值，保留 null、false、0 和空字符串；后面的有效值优先，不递归合并或修改输入
 * @param sources 按优先级从低到高排列的源对象
 * @returns 过滤 undefined 属性后的新对象
 * @throws 属性读取失败时抛出 RetikzFoundationError，原始异常保留为 cause
 * @template T 被浅合并的对象类型
 */
export const mergeDefinedProperties = <T extends object>(sources: ReadonlyArray<Readonly<T> | undefined>): Partial<T> =>
  mergeProperties(sources, { shouldOverride: value => value !== undefined });

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
