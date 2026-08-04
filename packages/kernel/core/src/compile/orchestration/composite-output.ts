import { ZodError } from 'zod';

import type {
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeReplayWrapper,
  Transform,
} from '../../contract';
import type { IRChild } from '../../schemas';
import type { CompositeCompileOwner, CompositeCompileSession, CompositeRuntimeOutputChild } from './types';

import { ScopePropsSchema } from '../../schemas';
import { cloneAndFreezeJson } from '../../shared/json';
import { CompositeContractError } from '../probe-failure';
import { withProviderOutputValidationBoundary } from '../scene-primitive';

const builtinChildTypes = new Set(['node', 'path', 'coordinate', 'scope']);

/** 从 Scope schema 失败中提取可读的 Theme 字段路径 */
const readThemeIssuePath = (error: unknown): string | undefined => {
  if (!(error instanceof ZodError)) return undefined;
  const issue = error.issues[0];
  const segments = issue.path.map(String);
  if (issue.code === 'unrecognized_keys') segments.push(issue.keys[0]);
  return segments.join('.');
};

/** 脱离普通 callback child，并只校验主链 dispatch 所需的顶层判别结构 */
const snapshotCompositeCallbackChild = (owner: string, value: unknown, location: string): IRChild => {
  const snapshot = cloneAndFreezeJson(value, `${owner} ${location}`);
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new CompositeContractError(
      `${owner} received an invalid ${location}; the value may be forged or belong to another compile session.`,
    );
  }
  const child = snapshot as Record<string, unknown>;
  const type = child.type;
  const isBuiltin = typeof type === 'string' && builtinChildTypes.has(type);
  const isComposite =
    typeof child.namespace === 'string' && child.namespace.length > 0 && typeof type === 'string' && type.length > 0;
  if (!isBuiltin && !isComposite) {
    throw new CompositeContractError(
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

/** 校验、脱离并冻结 Expand Composite 返回的普通 IR children */
export const validateExpandCompositeOutput = (owner: string, produced: unknown): ReadonlyArray<IRChild> =>
  withProviderOutputValidationBoundary(owner, () => {
    const values = Array.isArray(produced) ? Array.from(produced.entries(), ([, value]) => value) : [produced];
    return Object.freeze(values.map((value, index) => snapshotCompositeOutputChild(owner, value, index)));
  });

/** 递归冻结 builder 已 detached 的 plain data */
const deepFreeze = <T>(value: T): T => {
  const input: unknown = value;
  if (input === null || typeof input !== 'object' || Object.isFrozen(input)) return value;
  for (const child of Object.values(input)) deepFreeze(child);
  Object.freeze(input);
  return value;
};

/** 以普通 Scope props schema 校验、脱离并冻结完整 authored Scope props */
const cloneScopeProps = (props: unknown, owner: CompositeCompileOwner): CompositeCompileScopeProps => {
  if (props === null || typeof props !== 'object' || Array.isArray(props)) {
    throw new CompositeContractError(`${owner.label} received invalid runtime Scope props.`);
  }
  let parsed: ReturnType<typeof ScopePropsSchema.parse>;
  try {
    parsed = ScopePropsSchema.parse(props);
  } catch (error) {
    const raw = props as Record<string, unknown>;
    const themeIssuePath = raw.theme === undefined ? undefined : readThemeIssuePath(error);
    throw new CompositeContractError(
      themeIssuePath === undefined
        ? `${owner.label} received invalid or unsupported runtime Scope props.`
        : `${owner.label} received invalid runtime Scope ${themeIssuePath}.`,
      { cause: error },
    );
  }
  return deepFreeze(parsed);
};

/** 校验 replay wrapper 的已 lowering Scene transform 并复制为 detached frozen value */
const cloneReplayTransform = (value: unknown, owner: CompositeCompileOwner, index: number): Transform => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new CompositeContractError(`${owner.label} received an invalid replay wrapper transform at index ${index}.`);
  }
  const fail = (): never => {
    throw new CompositeContractError(
      `${owner.label} received an invalid or non-finite replay wrapper transform at index ${index}.`,
    );
  };
  const assertFinite: (number: unknown) => asserts number is number = number => {
    if (typeof number !== 'number' || !Number.isFinite(number)) fail();
  };
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);
  switch (input.kind) {
    case 'translate': {
      const { x, y } = input;
      if (keys.some(key => !['kind', 'x', 'y'].includes(key))) fail();
      assertFinite(x);
      assertFinite(y);
      return Object.freeze({ kind: 'translate', x, y });
    }
    case 'scale': {
      const { x, y } = input;
      if (keys.some(key => !['kind', 'x', 'y'].includes(key))) fail();
      assertFinite(x);
      if (y !== undefined) assertFinite(y);
      return Object.freeze({ kind: 'scale', x, ...(y === undefined ? {} : { y }) });
    }
    case 'rotate': {
      const { degrees, cx, cy } = input;
      if (keys.some(key => !['kind', 'degrees', 'cx', 'cy'].includes(key))) fail();
      assertFinite(degrees);
      if (cx !== undefined) assertFinite(cx);
      if (cy !== undefined) assertFinite(cy);
      return Object.freeze({
        kind: 'rotate',
        degrees,
        ...(cx === undefined ? {} : { cx }),
        ...(cy === undefined ? {} : { cy }),
      });
    }
    default:
      return fail();
  }
};

/** 校验并冻结 replay 专用的 transform / clip 外壳 */
const cloneReplayWrapper = (wrapper: unknown, owner: CompositeCompileOwner): CompositeReplayWrapper | undefined => {
  if (wrapper === undefined) return undefined;
  if (wrapper === null || typeof wrapper !== 'object' || Array.isArray(wrapper)) {
    throw new CompositeContractError(`${owner.label} received an invalid replay wrapper.`);
  }
  const raw = wrapper as Record<string, unknown>;
  const unsupportedKeys = Object.keys(raw).filter(key => !['transforms', 'clip'].includes(key));
  if (unsupportedKeys.length > 0) {
    throw new CompositeContractError(
      `${owner.label} received unsupported replay wrapper fields: ${unsupportedKeys.map(key => `'${key}'`).join(', ')}.`,
    );
  }
  const rawTransforms = raw.transforms;
  const rawClip = raw.clip;
  if (rawTransforms !== undefined && !Array.isArray(rawTransforms)) {
    throw new CompositeContractError(`${owner.label} received invalid replay wrapper transforms; expected an array.`);
  }
  let parsed: ReturnType<typeof ScopePropsSchema.parse>;
  try {
    parsed = ScopePropsSchema.parse(rawClip === undefined ? {} : { clip: rawClip });
  } catch (error) {
    throw new CompositeContractError(`${owner.label} received an invalid replay wrapper clip.`, { cause: error });
  }
  const transforms =
    rawTransforms === undefined
      ? undefined
      : Array.from(rawTransforms, (transform, index) => cloneReplayTransform(transform, owner, index));
  return deepFreeze({
    ...(transforms === undefined ? {} : { transforms }),
    ...(parsed.clip === undefined ? {} : { clip: parsed.clip }),
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
      throw new CompositeContractError(`${owner.label} received an invalid or forged layout result.`);
    }
    const layoutResult = session.layoutResults.get(result);
    if (layoutResult === undefined) {
      throw new CompositeContractError(`${owner.label} received an invalid or forged layout result.`);
    }
    if (layoutResult.owner !== owner) {
      throw new CompositeContractError(
        `${owner.label} received a layout result that does not belong to this composite callback.`,
      );
    }
    const clonedWrapper = cloneReplayWrapper(wrapper, owner);
    const child: CompositeRuntimeOutputChild = Object.freeze({
      kind: 'replay',
      replay: layoutResult.replay,
      ...(clonedWrapper === undefined ? {} : { wrapper: clonedWrapper }),
    });
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });
    return handle;
  });

/** 创建 callback-local runtime Scope output child */
export const createCompositeScopeChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  props: unknown,
  children: unknown,
): CompositeCompileChild =>
  withProviderOutputValidationBoundary(owner.label, () => {
    if (!Array.isArray(children)) {
      throw new CompositeContractError(`${owner.label} received invalid runtime Scope children.`);
    }
    const clonedChildren = Array.from(children, (child: unknown, index) => {
      if (child !== null && typeof child === 'object') {
        const entry = session.outputChildren.get(child);
        if (entry !== undefined) {
          if (entry.owner !== owner) {
            throw new CompositeContractError(
              `${owner.label} received an output child that does not belong to this composite callback.`,
            );
          }
          return child as CompositeCompileChild;
        }
      }
      return snapshotCompositeOutputChild(owner.label, child, index);
    });
    const child: CompositeRuntimeOutputChild = Object.freeze({
      kind: 'scope',
      props: cloneScopeProps(props, owner),
      children: Object.freeze(clonedChildren),
    });
    const handle = Object.freeze({}) as CompositeCompileChild;
    session.outputChildren.set(handle, { owner, child, used: false });
    return handle;
  });
