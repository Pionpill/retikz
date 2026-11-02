import type {
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeReplayWrapper,
  CompositeInputScope,
} from '../../../contract';
import { guardProviderOutput } from '../../../resolve';
import { createCompositeContractError } from '../../../resolve/diagnostics';
import type { IRChild } from '../../../schemas';
import { cloneAndFreezeJson } from '../../../shared/json';
import type {
  TreeCompileContext,
  CompositeCompileSession,
  CompositeCompileOwner,
  CompositeRuntimeOutputChild,
} from '../../context';

const builtinChildTypes = new Set(['node', 'path', 'coordinate', 'scope']);

/** 脱离普通 callback child，并只校验主链 dispatch 所需的顶层判别结构 */
const snapshotCompositeCallbackChild = (owner: string, value: unknown, location: string): IRChild => {
  const snapshot = cloneAndFreezeJson(value, `${owner} ${location}`);
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw createCompositeContractError(
      `${owner} received an invalid ${location}; the value may be forged or belong to another compile session.`,
    );
  }

  const child = snapshot as Record<string, unknown>;
  const type = child.type;
  const isBuiltin = typeof type === 'string' && builtinChildTypes.has(type);
  const isComposite =
    typeof child.namespace === 'string' && child.namespace.length > 0 && typeof type === 'string' && type.length > 0;
  if (!isBuiltin && !isComposite) {
    throw createCompositeContractError(
      `${owner} received an invalid ${location}; the value may be forged or belong to another compile session.`,
    );
  }

  return snapshot as IRChild;
};

/** 脱离 callback compile result 中的普通 output child */
export const snapshotCompositeOutputChild = (owner: string, value: unknown, index: number): IRChild =>
  snapshotCompositeCallbackChild(owner, value, `output child at index ${index}`);

/** 脱离 callback 交给 layoutChild 的候选 child */
export const snapshotCompositeLayoutChild = (owner: string, value: unknown, index: number): IRChild =>
  snapshotCompositeCallbackChild(owner, value, `layoutChild input at probe ${index}`);

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
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  result: unknown,
  wrapper?: CompositeReplayWrapper,
): CompositeCompileChild =>
  guardProviderOutput(owner.label, () => {
    if (result === null || typeof result !== 'object') {
      throw createCompositeContractError(`${owner.label} received an invalid or forged layout result.`);
    }

    const layoutResult = session.layoutResults.get(result);
    if (layoutResult === undefined) {
      throw createCompositeContractError(`${owner.label} received an invalid or forged layout result.`);
    }

    if (layoutResult.owner !== owner) {
      throw createCompositeContractError(
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
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  props: CompositeCompileScopeProps,
  children: unknown,
): CompositeCompileChild =>
  guardProviderOutput(owner.label, () => {
    if (!Array.isArray(children)) {
      throw createCompositeContractError(`${owner.label} received invalid context Scope children.`);
    }

    const clonedChildren = Array.from(children, (child: unknown, index) => {
      if (child !== null && typeof child === 'object') {
        const entry = session.outputChildren.get(child);
        if (entry !== undefined) {
          if (entry.owner !== owner) {
            throw createCompositeContractError(
              `${owner.label} received an output child that does not belong to this composite callback.`,
            );
          }

          return child as CompositeCompileChild | CompositeBoundChild;
        }
      }

      return snapshotCompositeOutputChild(owner.label, child, index);
    });
    const child: CompositeRuntimeOutputChild = {
      kind: 'scope',
      props: structuredClone(props),
      children: clonedChildren,
    };
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });

    return handle;
  });

/** 创建携带准确 Source 子树输入的 callback-local 子项 */
export const createCompositeBoundChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  scope: CompositeInputScope,
): CompositeBoundChild => {
  const child = snapshotCompositeLayoutChild(owner.label, scope.source, 0);
  const handle = Object.freeze({}) as CompositeBoundChild;
  session.outputChildren.set(handle, { owner, child: { kind: 'bound', child, runtimeInputs: scope }, used: false });

  return handle;
};

/** 只按本次会话登记的对象身份识别组件输出句柄 */
export const isCompositeOutputHandle = (
  context: TreeCompileContext,
  output: unknown,
): output is CompositeCompileChild | CompositeBoundChild =>
  output !== null && typeof output === 'object' && context.session.outputChildren.has(output);
