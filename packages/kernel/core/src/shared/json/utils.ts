import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 校验并复制 JSON-safe plain data，返回 detached deeply immutable value */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  const ancestors = new Set<object>();
  const clone = (input: unknown, currentPath: string): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input))
        throw new RetikzCoreError(RetikzCoreErrorCode.Json, `${currentPath} must contain only finite JSON numbers`);
      return input;
    }
    if (typeof input !== 'object')
      throw new RetikzCoreError(RetikzCoreErrorCode.Json, `${currentPath} must be JSON-safe plain data`);
    if (ancestors.has(input))
      throw new RetikzCoreError(RetikzCoreErrorCode.Json, `${currentPath} must not contain cyclic references`);
    if (Object.getOwnPropertySymbols(input).length > 0) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Json, `${currentPath} must not contain symbol keys`);
    }

    ancestors.add(input);
    try {
      if (Array.isArray(input)) {
        const propertyNames = Object.getOwnPropertyNames(input);
        if (propertyNames.length !== input.length + 1) {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Json,
            `${currentPath} must not contain sparse items or extra array properties`,
          );
        }
        const output: Array<unknown> = [];
        for (let index = 0; index < input.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
          if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            throw new RetikzCoreError(
              RetikzCoreErrorCode.Json,
              `${currentPath}[${index}] must be an enumerable JSON data item`,
            );
          }
          output.push(clone(descriptor.value, `${currentPath}[${index}]`));
        }
        return Object.freeze(output);
      }

      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Json,
          `${currentPath} must contain only plain objects and arrays`,
        );
      }
      const output = Object.create(null) as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Json,
            `${currentPath}.${key} must be an enumerable JSON data property`,
          );
        }
        output[key] = clone(descriptor.value, `${currentPath}.${key}`);
      }
      return Object.freeze(output);
    } finally {
      ancestors.delete(input);
    }
  };
  return clone(value, path) as T;
};

/** 比较两个 JSON-safe tree 的结构语义，不依赖对象属性插入顺序 */
export const jsonStructuralEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!Object.hasOwn(left, index) || !Object.hasOwn(right, index)) return false;
      if (!jsonStructuralEquals(left[index], right[index])) return false;
    }
    return true;
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      key => Object.hasOwn(right, key) && jsonStructuralEquals(Reflect.get(left, key), Reflect.get(right, key)),
    )
  );
};
