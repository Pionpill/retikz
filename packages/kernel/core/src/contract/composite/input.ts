import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRChild, IRScene } from '../../schemas';
import { cloneAndFreezeJson, jsonStructuralEquals } from '../../shared/json';

/** 精确 Source 属性路径，数字表示数组下标 */
export type CompositeInputPath = ReadonlyArray<string | number>;

/** 一个 composite 实例的已准备同步运行时输入 */
export type CompositeInputBinding = Readonly<{
  /** 相对绑定 Source 的属性路径 */
  path: CompositeInputPath;
  /** 由领域消费、调用期间借用的只读运行时值 */
  input: unknown;
}>;

declare const compositeInputBindingsBrand: unique symbol;

/** 与完整 Source 配对、不会进入 JSON 的运行时绑定集合 */
export type CompositeInputBindings = Readonly<{ [compositeInputBindingsBrand]: never }>;

declare const compositeBoundChildBrand: unique symbol;

/** 当前 callback 独占的可重复测量、单次放置子项句柄 */
export type CompositeBoundChild = Readonly<{ [compositeBoundChildBrand]: never }>;

/** expand 与 layout-aware compile 共用的实例输入上下文 */
export type CompositeRuntimeInputContext = Readonly<{
  /** 当前 Source 位置的同步输入；未绑定时为 undefined */
  runtimeInput: unknown;
  /** 选择当前 composite 原始 Source 的作者子项并转交全部子树绑定 */
  sourceChild: (path: CompositeInputPath) => CompositeBoundChild;
  /** 为生成的子项显式提供相对 child 的运行时绑定 */
  bindChild: (child: IRChild, bindings: ReadonlyArray<CompositeInputBinding>) => CompositeBoundChild;
}>;

/** 编译内部使用的 Source 子树及稀疏输入 */
export type CompositeRuntimeInputScope = Readonly<{
  /** 独立的原始 Source 子树 */
  source: unknown;
  /** 相对当前 Source 子树的绑定 */
  bindings: ReadonlyArray<CompositeInputBinding>;
}>;

const snapshots = new WeakMap<CompositeInputBindings, CompositeRuntimeInputScope>();

/** 精确读取 Source 路径，不使用继承属性或模糊字段匹配 */
const sourceAtPath = (source: unknown, path: CompositeInputPath): unknown => {
  let current = source;

  for (const segment of path) {
    if (
      (Array.isArray(current) && (typeof segment !== 'number' || !Number.isSafeInteger(segment) || segment < 0)) ||
      (!Array.isArray(current) && typeof segment !== 'string')
    )
      throw new RetikzCoreError(
        RetikzCoreErrorCode.CompositeContractViolation,
        `Composite input path ${JSON.stringify(path)} must use numeric array indices and string object fields`,
      );

    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment))
      throw new RetikzCoreError(
        RetikzCoreErrorCode.CompositeContractViolation,
        `Composite input path ${JSON.stringify(path)} does not exist in Source`,
      );

    current = (current as Record<string | number, unknown>)[segment];
  }

  return current;
};

/** 分离 Source 配对事实和路径，借用调用方只读输入 */
export const captureCompositeInputScope = (
  source: unknown,
  bindings: ReadonlyArray<CompositeInputBinding>,
): CompositeRuntimeInputScope => {
  const snapshot = cloneAndFreezeJson(source, 'Composite input Source');
  const paths = new Set<string>();
  const captured = bindings.map(binding => {
    const key = JSON.stringify(binding.path);
    if (paths.has(key))
      throw new RetikzCoreError(
        RetikzCoreErrorCode.CompositeContractViolation,
        `Duplicate composite input path ${key}`,
      );

    paths.add(key);
    const target = sourceAtPath(snapshot, binding.path);
    if (target === null || typeof target !== 'object' || !('namespace' in target) || !('type' in target))
      throw new RetikzCoreError(
        RetikzCoreErrorCode.CompositeContractViolation,
        `Composite input path ${key} must select a composite Source`,
      );

    return Object.freeze({ path: Object.freeze([...binding.path]), input: binding.input });
  });

  return Object.freeze({ source: snapshot, bindings: Object.freeze(captured) });
};

/** 在 Source parse/capture 前检查完整配对，并返回内部子树视图 */
export const resolveCompositeInputScope = (
  source: IRScene,
  inputs: CompositeInputBindings | undefined,
): CompositeRuntimeInputScope => {
  if (inputs === undefined) return { source, bindings: [] };

  const snapshot = snapshots.get(inputs);
  if (snapshot === undefined || !jsonStructuralEquals(snapshot.source, source))
    throw new RetikzCoreError(
      RetikzCoreErrorCode.CompositeContractViolation,
      'Composite input bindings do not match this Source',
    );

  return snapshot;
};

/** 从原始 Source 选择子树，并将其绑定重定位到局部路径 */
export const selectCompositeInputScope = (
  scope: CompositeRuntimeInputScope,
  path: CompositeInputPath,
): CompositeRuntimeInputScope => ({
  source: sourceAtPath(scope.source, path),
  bindings: scope.bindings
    .filter(binding => path.every((segment, index) => binding.path[index] === segment))
    .map(binding => ({ path: binding.path.slice(path.length), input: binding.input })),
});

/** 为完整 Source 创建精确的 composite 实例运行时绑定 */
export const createCompositeInputBindings = (
  source: IRScene,
  bindings: ReadonlyArray<CompositeInputBinding>,
): CompositeInputBindings => {
  const scope = captureCompositeInputScope(source, bindings);
  const handle = Object.freeze({}) as CompositeInputBindings;
  snapshots.set(handle, scope);

  return handle;
};
