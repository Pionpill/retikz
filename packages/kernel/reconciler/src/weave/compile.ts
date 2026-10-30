import type { CompiledNodeLayout, ElementCompileOptions, ElementCompileResult } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

/** 候选版本中的名称绑定，身份对应稳定的 Weave 节点 */
export type WeaveBinding =
  | Readonly<{ state: 'pending'; binding: object }>
  | Readonly<{ state: 'ready'; binding: object; irPath?: PropertyPath; layout: CompiledNodeLayout }>;

/** 声明位置可见的名称 frame */
export type WeaveNamespace = Readonly<{
  /** 当前 frame 的声明绑定 */
  bindings: ReadonlyMap<string, WeaveBinding>;
  /** 外层可见 frame */
  parent?: WeaveNamespace;
}>;

/** 一次名称查找经过的 frame，包含未命中事实 */
export type WeaveCompileRead = Readonly<{
  /** 实际访问的 frame */
  namespace: WeaveNamespace;
  /** 查询名称 */
  name: string;
  /** 当前 frame 中的查询结果 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中项对应的稳定节点 */
  binding?: object;
}>;

/** Weave 调用位置状态；名称图不越过 Core 边界 */
export type WeaveCompileOptions = Omit<ElementCompileOptions, 'lookupReference'> &
  Readonly<{
    /** 声明位置的可见名称链 */
    namespace?: WeaveNamespace;
    /** 不允许后代引用包络的祖先绑定 */
    ancestorScopes?: ReadonlySet<object>;
  }>;

/** Core 计算结果与本次调用的读取事实 */
export type WeaveCompileResult<TCompiled> = ElementCompileResult<TCompiled> &
  Readonly<{
    /** 编译期间实际发生的名称读取 */
    reads: ReadonlyArray<WeaveCompileRead>;
  }>;

/** 按 inside-out 读取名称，并按需记录每个访问的 frame */
export const lookupWeaveBinding = (
  namespace: WeaveNamespace | undefined,
  name: string,
  reads?: Array<WeaveCompileRead>,
): WeaveBinding | undefined => {
  for (let frame = namespace; frame !== undefined; frame = frame.parent) {
    const entry = frame.bindings.get(name);
    reads?.push(
      Object.freeze({
        namespace: frame,
        name,
        state: entry?.state ?? 'missing',
        ...(entry === undefined ? {} : { binding: entry.binding }),
      }),
    );
    if (entry !== undefined) return entry;
  }
  return undefined;
};

/** 将版本内查询适配到 Core，并持有调用过程中收集的读取记录 */
export const runWeaveCompilation = <TCompiled>(
  options: WeaveCompileOptions,
  compile: (options: ElementCompileOptions) => ElementCompileResult<TCompiled>,
): WeaveCompileResult<TCompiled> => {
  const { namespace, ancestorScopes, ...coreOptions } = options;
  const reads: Array<WeaveCompileRead> = [];
  const result = compile({
    ...coreOptions,
    lookupReference: name => {
      const entry = lookupWeaveBinding(namespace, name, reads);
      if (entry === undefined) return undefined;
      if (ancestorScopes?.has(entry.binding)) return { state: 'ancestor' };
      return entry.state === 'pending'
        ? { state: 'pending' }
        : { state: 'ready', layout: entry.layout, irPath: entry.irPath };
    },
  });
  return { ...result, reads: Object.freeze(reads) };
};
