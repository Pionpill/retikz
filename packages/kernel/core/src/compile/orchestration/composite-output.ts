import type { CompositeCompileChild, CompositeCompileScopeProps, CompositeReplay, Transform } from '../../contract';
import type { CompositeCompileOwner, CompositeCompileSession, CompositeRuntimeOutputChild } from './types';

import { ChildSchema, ScopeSchema } from '../../schemas';

/** 递归冻结 builder 已 detached 的 plain data */
const deepFreeze = <T>(value: T): T => {
  const input: unknown = value;
  if (input === null || typeof input !== 'object' || Object.isFrozen(input)) return value;
  for (const child of Object.values(input)) deepFreeze(child);
  Object.freeze(input);
  return value;
};

/** 校验 Scene numeric transform 并复制为 detached frozen value */
const cloneTransform = (value: unknown, owner: CompositeCompileOwner, index: number): Transform => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${owner.label} received an invalid runtime Scope transform at index ${index}.`);
  }
  const fail = (): never => {
    throw new Error(`${owner.label} received an invalid or non-finite runtime Scope transform at index ${index}.`);
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

/** 以普通 Scope schema 校验结构字段，同时保留已 lowering 的 Scene transforms */
const cloneScopeProps = (props: unknown, owner: CompositeCompileOwner): CompositeCompileScopeProps => {
  if (props === null || typeof props !== 'object' || Array.isArray(props)) {
    throw new Error(`${owner.label} received invalid runtime Scope props.`);
  }
  const raw = props as Record<string, unknown>;
  const allowedKeys = new Set([
    'id',
    'localNamespace',
    'transforms',
    'clip',
    'zIndex',
    'boundingShape',
    'meta',
    'animations',
  ]);
  const unsupportedKeys = Object.keys(raw).filter(key => !allowedKeys.has(key));
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `${owner.label} received unsupported runtime Scope props: ${unsupportedKeys.map(key => `'${key}'`).join(', ')}.`,
    );
  }
  const { transforms: rawTransforms, ...structural } = raw;
  let parsed: ReturnType<typeof ScopeSchema.parse>;
  try {
    parsed = ScopeSchema.parse({ type: 'scope', ...structural, children: [] });
  } catch (error) {
    throw new Error(`${owner.label} received invalid or unsupported runtime Scope props.`, { cause: error });
  }
  if (rawTransforms !== undefined && !Array.isArray(rawTransforms)) {
    throw new Error(`${owner.label} received invalid runtime Scope transforms.`);
  }
  const clonedTransforms = rawTransforms?.map((transform, index) => cloneTransform(transform, owner, index));
  const parsedProps: CompositeCompileScopeProps = {
    ...(parsed.id === undefined ? {} : { id: parsed.id }),
    ...(parsed.localNamespace === undefined ? {} : { localNamespace: parsed.localNamespace }),
    ...(parsed.clip === undefined ? {} : { clip: parsed.clip }),
    ...(parsed.zIndex === undefined ? {} : { zIndex: parsed.zIndex }),
    ...(parsed.boundingShape === undefined ? {} : { boundingShape: parsed.boundingShape }),
    ...(parsed.meta === undefined ? {} : { meta: parsed.meta }),
    ...(parsed.animations === undefined ? {} : { animations: parsed.animations }),
  };
  return deepFreeze({
    ...parsedProps,
    ...(clonedTransforms === undefined ? {} : { transforms: clonedTransforms }),
  });
};

/** 创建 callback-local replay output child */
export const createCompositeReplayChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  result: unknown,
  transforms?: ReadonlyArray<Transform>,
): CompositeCompileChild => {
  if (result === null || typeof result !== 'object') {
    throw new Error(`${owner.label} received an invalid or forged layout result.`);
  }
  const replay = (result as { replay?: unknown }).replay;
  if (replay === null || (typeof replay !== 'object' && typeof replay !== 'function')) {
    throw new Error(`${owner.label} received an invalid or forged layout result.`);
  }
  const transaction = session.replayTransactions.get(replay);
  if (transaction === undefined) {
    throw new Error(`${owner.label} received a layout result that does not belong to this compile or was forged.`);
  }
  if (transaction.owner !== owner) {
    throw new Error(`${owner.label} received a layout result that does not belong to this composite callback.`);
  }
  if (transforms !== undefined && !Array.isArray(transforms)) {
    throw new Error(`${owner.label} received invalid replay transforms; expected an array.`);
  }
  const clonedTransforms = transforms?.map((transform, index) => cloneTransform(transform, owner, index));
  const child: CompositeRuntimeOutputChild = Object.freeze({
    kind: 'replay',
    replay: replay as CompositeReplay,
    ...(clonedTransforms === undefined ? {} : { transforms: Object.freeze(clonedTransforms) }),
  });
  const handle = Object.freeze({}) as CompositeCompileChild;
  session.outputChildren.set(handle, Object.freeze({ owner, child }));
  return handle;
};

/** 创建 callback-local runtime Scope output child */
export const createCompositeScopeChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  props: unknown,
  children: unknown,
): CompositeCompileChild => {
  if (!Array.isArray(children)) {
    throw new Error(`${owner.label} received invalid runtime Scope children.`);
  }
  const clonedChildren = children.map((child: unknown, index) => {
    if (child !== null && typeof child === 'object') {
      const entry = session.outputChildren.get(child);
      if (entry !== undefined) {
        if (entry.owner !== owner) {
          throw new Error(`${owner.label} received an output child that does not belong to this composite callback.`);
        }
        return child as CompositeCompileChild;
      }
    }
    try {
      return deepFreeze(ChildSchema.parse(child));
    } catch (error) {
      throw new Error(`${owner.label} received an invalid or forged runtime Scope child at index ${index}.`, {
        cause: error,
      });
    }
  });
  const child: CompositeRuntimeOutputChild = Object.freeze({
    kind: 'scope',
    props: cloneScopeProps(props, owner),
    children: Object.freeze(clonedChildren),
  });
  const handle = Object.freeze({}) as CompositeCompileChild;
  session.outputChildren.set(handle, Object.freeze({ owner, child }));
  return handle;
};

/** 解析当前 callback 的 opaque output child */
export const resolveCompositeOutputChild = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  handle: CompositeCompileChild,
): CompositeRuntimeOutputChild => {
  const entry = session.outputChildren.get(handle);
  if (entry === undefined) {
    throw new Error(`${owner.label} received an output child that does not belong to this compile or was forged.`);
  }
  if (entry.owner !== owner) {
    throw new Error(`${owner.label} received an output child that does not belong to this composite callback.`);
  }
  return entry.child;
};
