import type {
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeInputScope,
  CompositeReplayWrapper,
  IRChild,
} from '@retikz/core';
import { createContractViolationError, guardProviderOutput } from '@retikz/core';

import type {
  CompileRuntime,
  CompositeCompileOwner,
  CompositeCompileState,
  CompositeRuntimeOutputChild,
} from '../../runtime';

const builtinChildTypes = new Set(['node', 'path', 'coordinate', 'scope']);

/** 借用普通 IR 子项，仅检查顶层判别字段，以拒绝未在当前会话登记的伪造句柄 */
export const readCompositeChild = (owner: string, value: unknown, location: string): IRChild => {
  if (value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string') {
    if (
      builtinChildTypes.has(value.type) ||
      ('namespace' in value &&
        typeof value.namespace === 'string' &&
        value.namespace.length > 0 &&
        value.type.length > 0)
    )
      return value as IRChild;
  }
  throw createContractViolationError(
    `${owner} received an invalid ${location}; the value may be forged or belong to another compile session.`,
  );
};

/** 复制回放外壳，隔离 callback 后续修改 */
const cloneReplayWrapper = (wrapper: CompositeReplayWrapper | undefined): CompositeReplayWrapper | undefined => {
  if (wrapper === undefined) return undefined;
  const { transforms, clip } = wrapper;
  return structuredClone({
    ...(transforms === undefined ? {} : { transforms }),
    ...(clip === undefined ? {} : { clip }),
  });
};

/** 创建 callback-local replay output child */
export const createCompositeReplayChild = (
  session: CompositeCompileState,
  owner: CompositeCompileOwner,
  result: unknown,
  wrapper?: CompositeReplayWrapper,
): CompositeCompileChild =>
  guardProviderOutput(owner.label, () => {
    if (result === null || typeof result !== 'object') {
      throw createContractViolationError(`${owner.label} received an invalid or forged layout result.`);
    }

    const layoutResult = session.layoutResults.get(result);
    if (layoutResult === undefined) {
      throw createContractViolationError(`${owner.label} received an invalid or forged layout result.`);
    }

    if (layoutResult.owner !== owner) {
      throw createContractViolationError(
        `${owner.label} received a layout result that does not belong to this composite callback.`,
      );
    }

    const clonedWrapper = cloneReplayWrapper(wrapper);
    const child: CompositeRuntimeOutputChild = {
      kind: 'replay',
      replay: layoutResult.replay,
      ...(clonedWrapper === undefined ? {} : { wrapper: clonedWrapper }),
    };
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });

    return handle;
  });

/** 创建 callback-local context Scope output child */
export const createCompositeScopeChild = (
  session: CompositeCompileState,
  owner: CompositeCompileOwner,
  props: CompositeCompileScopeProps,
  children: ReadonlyArray<IRChild | CompositeCompileChild | CompositeBoundChild>,
): CompositeCompileChild =>
  guardProviderOutput(owner.label, () => {
    for (const [index, child] of children.entries()) {
      const entry = session.outputChildren.get(child);
      if (entry === undefined) readCompositeChild(owner.label, child, `output child at index ${index}`);
      else if (entry.owner !== owner)
        throw createContractViolationError(
          `${owner.label} received an output child that does not belong to this composite callback.`,
        );
    }
    const child: CompositeRuntimeOutputChild = { kind: 'scope', props, children };
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });

    return handle;
  });

/** 创建携带准确 Source 子树输入的 callback-local 子项 */
export const createCompositeBoundChild = (
  session: CompositeCompileState,
  owner: CompositeCompileOwner,
  scope: CompositeInputScope,
): CompositeBoundChild => {
  const child = readCompositeChild(owner.label, scope.source, 'bound child');
  const handle = Object.freeze({}) as CompositeBoundChild;
  session.outputChildren.set(handle, { owner, child: { kind: 'bound', child, runtimeInputs: scope }, used: false });

  return handle;
};

/** 只按本次会话登记的对象身份识别组件输出句柄 */
export const isCompositeOutputHandle = (
  runtime: CompileRuntime,
  output: unknown,
): output is CompositeCompileChild | CompositeBoundChild =>
  output !== null && typeof output === 'object' && runtime.state.composite.outputChildren.has(output);
