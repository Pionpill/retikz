import type { PropertyPath } from '@retikz/foundation';
import { encodePropertyPath, hasPropertyPathPrefix, readPropertyPath, jsonStructuralEquals } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRChild, IRScene } from '../../schemas';

/** 一个 composite 实例的已准备同步运行时输入 */
export type CompositeInputBinding = Readonly<{
  /** 相对绑定 Source 的属性路径 */
  path: PropertyPath;
  /** 由领域消费、调用期间借用的只读运行时值 */
  input: unknown;
}>;

declare const compositeInputBindingsBrand: unique symbol;

/** 与完整 Source 配对、不会进入 JSON 的运行时绑定集合 */
export type CompositeInputBindings = Readonly<{ [compositeInputBindingsBrand]: never }>;

declare const compositeBoundChildBrand: unique symbol;

/** 当前 callback 独占的可重复测量、单次放置子项句柄 */
export type CompositeBoundChild = Readonly<{ [compositeBoundChildBrand]: never }>;

/** 复合编译的实例输入上下文 */
export type CompositeRuntimeInputContext = Readonly<{
  /** 当前 Source 位置的同步输入；未绑定时为 undefined */
  runtimeInput: unknown;
  /** 选择当前 composite 原始 Source 的作者子项并转交全部子树绑定 */
  selectSourceChild: (path: PropertyPath) => CompositeBoundChild;
  /** 为生成的子项显式提供相对 child 的运行时绑定 */
  bindChild: (child: IRChild, bindings: ReadonlyArray<CompositeInputBinding>) => CompositeBoundChild;
}>;

/** 编译内部使用的 Source 子树及稀疏输入 */
export type CompositeInputScope = Readonly<{
  /** 当前原始 Source 子树 */
  source: unknown;
  /** 当前子树在原始 Source 中的位置；根节点省略 */
  sourcePath?: PropertyPath;
  /** 相对当前 Source 子树的绑定 */
  bindings: ReadonlyArray<CompositeInputBinding>;
}>;

/** 绑定句柄与原始 Source 及其绑定的配对关系 */
const inputScopeMap = new WeakMap<CompositeInputBindings, CompositeInputScope>();

/** 精确读取 Source 路径，不使用继承属性或模糊字段匹配 */
const readSourceAtPath = (source: unknown, path: PropertyPath): unknown => {
  const target = readPropertyPath(source, path);
  if (target === undefined)
    throw new RetikzCoreError(
      RetikzCoreErrorCode.ContractViolation,
      `Composite input path ${encodePropertyPath(path)} does not exist in Source`,
    );
  return target;
};

/** 校验绑定路径并借用原始 Source 和绑定集合 */
export const captureCompositeInputScope = (
  source: IRScene | IRChild,
  bindings: ReadonlyArray<CompositeInputBinding>,
): CompositeInputScope => {
  /** 本次捕获中已绑定的精确路径，用序列化形式检测重复 */
  const boundPaths = new Set<string>();
  for (const binding of bindings) {
    const key = encodePropertyPath(binding.path);
    if (boundPaths.has(key))
      throw new RetikzCoreError(RetikzCoreErrorCode.ContractViolation, `Duplicate composite input path ${key}`);

    boundPaths.add(key);
    const target = readSourceAtPath(source, binding.path);
    if (target === null || typeof target !== 'object' || !('namespace' in target) || !('type' in target))
      throw new RetikzCoreError(
        RetikzCoreErrorCode.ContractViolation,
        `Composite input path ${key} must select a composite Source`,
      );
  }

  return Object.freeze({ source, bindings });
};

/** 在 Source parse/capture 前检查完整配对，并返回内部子树视图 */
export const resolveCompositeInputScope = (
  source: IRScene,
  inputs: CompositeInputBindings | undefined,
): CompositeInputScope => {
  if (inputs === undefined) return { source, bindings: [] };

  const scope = inputScopeMap.get(inputs);
  if (scope === undefined || !jsonStructuralEquals(scope.source, source))
    throw new RetikzCoreError(
      RetikzCoreErrorCode.ContractViolation,
      'Composite input bindings do not match this Source',
    );

  return scope;
};

/** 从原始 Source 选择子树，并将其绑定重定位到局部路径 */
export const selectCompositeInputScope = (scope: CompositeInputScope, path: PropertyPath): CompositeInputScope => ({
  source: readSourceAtPath(scope.source, path),
  sourcePath: [...(scope.sourcePath ?? []), ...path],
  bindings: scope.bindings
    .filter(binding => hasPropertyPathPrefix(binding.path, path))
    .map(binding => ({ path: binding.path.slice(path.length), input: binding.input })),
});

/** 为完整 Source 创建实例绑定；调用方须在绑定使用期间保持 Source、路径和输入稳定 */
export const createCompositeInputBindings = (
  source: IRScene,
  bindings: ReadonlyArray<CompositeInputBinding>,
): CompositeInputBindings => {
  const scope = captureCompositeInputScope(source, bindings);
  const handle = Object.freeze({}) as CompositeInputBindings;
  inputScopeMap.set(handle, scope);

  return handle;
};
