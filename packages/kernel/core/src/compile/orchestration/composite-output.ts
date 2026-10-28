import type {
  CompositeCompileChild,
  CompositeBoundChild,
  CompositeCompileScopeProps,
  CompositeReplayWrapper,
  SpatialHandleDeclaration,
} from '../../contract';
import type { CompositeRuntimeInputScope } from '../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { createCompositeContractError } from '../../resolve/diagnostics';
import type { IRChild } from '../../schemas';
import { cloneAndFreezeJson } from '../../shared/json';
import { withProviderOutputValidationBoundary } from '../scene-primitive';
import type { CompositeCompileOwner, CompositeCompileSession, CompositeRuntimeOutputChild } from './types';

/** 检查组件空间声明的身份与几何不变量，并分离、冻结输出快照 */
const snapshotCompositeSpatialHandles = (owner: string, declarations: ReadonlyArray<SpatialHandleDeclaration>) => {
  try {
    /** 抛出当前组件空间声明的不变量错误 */
    const throwSpatialDeclarationError = (detail: string): never => {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        `${owner} returned an invalid spatial handle declaration: ${detail}.`,
      );
    };
    /** 当前所属者内已使用的主标识及别名，用于检测声明间冲突 */
    const declaredIds = new Set<string>();
    return Object.freeze(
      declarations.map((declaration, index) => {
        for (const id of [declaration.id, ...(declaration.aliasIds ?? [])]) {
          if (declaredIds.has(id)) throwSpatialDeclarationError(`duplicate spatial handle id '${id}'`);
          declaredIds.add(id);
        }
        const { x, y, width, height } = declaration.bounds;
        for (const [field, value] of Object.entries({ x, y, width, height })) {
          if (!Number.isFinite(value))
            throwSpatialDeclarationError(`spatialHandles[${index}].bounds.${field} must be finite`);
        }
        if (width < 0) throwSpatialDeclarationError(`spatialHandles[${index}].bounds.width must be nonnegative`);
        if (height < 0) throwSpatialDeclarationError(`spatialHandles[${index}].bounds.height must be nonnegative`);
        /** 当前声明中已出现的标签，用于检测重复 */
        const tags = new Set<string>();
        for (const tag of declaration.tags ?? []) {
          if (tags.has(tag))
            throwSpatialDeclarationError(`spatialHandles[${index}].tags contains duplicate tag '${tag}'`);
          tags.add(tag);
        }
        return Object.freeze({
          id: declaration.id,
          role: declaration.role,
          bounds: Object.freeze({ x, y, width, height }),
          ...(declaration.aliasIds === undefined ? {} : { aliasIds: Object.freeze([...declaration.aliasIds]) }),
          ...(declaration.tags === undefined ? {} : { tags: Object.freeze([...declaration.tags]) }),
          ...(declaration.payload === undefined
            ? {}
            : {
                payload: cloneAndFreezeJson(declaration.payload, `${owner} spatialHandles[${index}].payload`),
              }),
        });
      }),
    );
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw createCompositeContractError(detail, { cause });
  }
};

const builtinChildTypes = new Set(['node', 'path', 'coordinate', 'scope']);

/** 判断当前 composite owner 直接生成的普通 IR 区域是否引入空间 Scope */
const containsGeneratedSpatialScope = (children: ReadonlyArray<IRChild>): boolean =>
  children.some(child => {
    if ('namespace' in child || child.type !== 'scope') return false;
    const hasPosition =
      child.position !== undefined &&
      (!Array.isArray(child.position) || child.position[0] !== 0 || child.position[1] !== 0);
    if (hasPosition || (child.transforms?.length ?? 0) > 0) return true;
    return containsGeneratedSpatialScope(child.children);
  });

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

/** 校验直接声明的空间区域，带变换的子 Scope 应在自身局部坐标声明 */
export const resolveCompositeSpatialOutput = (
  owner: string,
  value: ReadonlyArray<SpatialHandleDeclaration> | undefined,
  children: ReadonlyArray<IRChild>,
) => {
  const spatialHandles = value === undefined ? undefined : snapshotCompositeSpatialHandles(owner, value);
  if ((spatialHandles?.length ?? 0) > 0 && containsGeneratedSpatialScope(children)) {
    throw createCompositeContractError(
      `${owner} spatialHandles cannot accompany a generated Scope with placement or transforms; declare them on the Scope.`,
    );
  }
  return spatialHandles;
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
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  result: unknown,
  wrapper?: CompositeReplayWrapper,
): CompositeCompileChild =>
  withProviderOutputValidationBoundary(owner.label, () => {
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

/** 创建 callback-local runtime Scope output child */
export const createCompositeScopeChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  props: CompositeCompileScopeProps,
  children: unknown,
  spatialHandles?: ReadonlyArray<SpatialHandleDeclaration>,
): CompositeCompileChild =>
  withProviderOutputValidationBoundary(owner.label, () => {
    if (!Array.isArray(children)) {
      throw createCompositeContractError(`${owner.label} received invalid runtime Scope children.`);
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
      ...(spatialHandles === undefined
        ? {}
        : { spatialHandles: snapshotCompositeSpatialHandles(owner.label, spatialHandles) }),
    };
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });

    return handle;
  });

/** 创建携带准确 Source 子树输入的 callback-local 子项 */
export const createCompositeBoundChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  scope: CompositeRuntimeInputScope,
): CompositeBoundChild => {
  const child = snapshotCompositeLayoutChild(owner.label, scope.source, 0);
  const handle = Object.freeze({}) as CompositeBoundChild;
  session.outputChildren.set(handle, { owner, child: { kind: 'bound', child, runtimeInputs: scope }, used: false });

  return handle;
};
