import type { RuntimeDeepReadonly } from '@retikz/core';
import type { RuntimeOwnerDefinition } from '@retikz/runtime';

import { defineRuntimeOwner } from '@retikz/runtime';

import type { AnimationPropertyRegistry, EasingRegistry } from '../animation';
import type { HydrationHandlers } from '../hydration';

import { RetikzEvent } from '../hydration';
import { isRetikzRetainedRenderError, RetikzRetainedRenderError, RetikzRetainedRenderErrorCode } from './error';
import { cloneAndFreezeRuntimeValue, isPlainObject, runtimeStructuralEquals } from './shared';

/** Render runtime config 的固定 owner key */
export const RENDER_RUNTIME_OWNER_KEY = '@retikz/render:runtime-config' as const;

/** Retained renderer layer cache 策略 */
export const RenderCachePolicy = {
  Auto: 'auto',
  Static: 'static',
  Dynamic: 'dynamic',
} as const;

/** Retained renderer layer cache 策略取值 */
export type RenderCachePolicyValue = (typeof RenderCachePolicy)[keyof typeof RenderCachePolicy];

/** 一份按注册顺序叠加的 hydration handlers */
export type RenderHandlerContribution = Readonly<{
  /** view 内单调递增的注册序号 */
  registration: number;
  /** 本次注册贡献的 handlers */
  handlers: RuntimeDeepReadonly<HydrationHandlers>;
}>;

/** 可随 Runtime transaction 原子更新的 renderer 配置输入 */
export type RenderRuntimeConfigInput = Readonly<{
  /** 按 registration 升序执行的 handlers contributions */
  handlerContributions?: ReadonlyArray<RenderHandlerContribution>;
  /** 动画执行配置 */
  animation?: Readonly<{
    /** 是否启用动画 */
    enabled?: boolean;
    /** 可选静态采样时刻 */
    snapshotAt?: number;
    /** 自定义 easing registry */
    easings?: EasingRegistry;
    /** 自定义 animation property registry */
    properties?: AnimationPropertyRegistry;
  }>;
  /** Canvas CSS user-space 尺寸；省略字段时按 committed Scene layout 推导 */
  canvas?: Readonly<{
    /** Canvas CSS user-space 宽度 */
    width?: number;
    /** Canvas CSS user-space 高度 */
    height?: number;
  }>;
  /** layer cache 策略 */
  cachePolicy?: RenderCachePolicyValue;
}>;

/** Session-owned deeply immutable renderer 配置 */
export type RenderRuntimeConfig = RuntimeDeepReadonly<RenderRuntimeConfigInput>;

const invalidRuntimeInput = (cause: unknown): never => {
  throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid, cause });
};

/** 只从 own data descriptors 捕获稠密数组，避免继承方法或 accessor 参与校验 */
const captureDenseArray = (value: unknown): ReadonlyArray<unknown> | undefined => {
  if (!Array.isArray(value)) return undefined;
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.enumerable ||
    !('value' in lengthDescriptor) ||
    typeof lengthDescriptor.value !== 'number' ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    keys.length !== lengthDescriptor.value + 1 ||
    keys.some(key => typeof key !== 'string')
  ) {
    return undefined;
  }
  const captured: Array<unknown> = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) return undefined;
    captured.push(descriptor.value);
  }
  return captured;
};

const assertPlainRecord: (value: unknown) => asserts value is Record<PropertyKey, unknown> = value => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !isPlainObject(value)) {
    return invalidRuntimeInput(value);
  }
};

/** 读取已经证明为 enumerable data property 的值，不触发用户 accessor */
const readDataProperty = (value: object, key: PropertyKey): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
    return invalidRuntimeInput(value);
  }
  return descriptor.value;
};

const assertAllowedKeys = (value: object, allowed: ReadonlySet<string>): void => {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) return invalidRuntimeInput(value);
    readDataProperty(value, key);
  }
};

const defineCapturedValue = (target: Record<PropertyKey, unknown>, key: string, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: false,
    writable: false,
  });
};

const captureHandlers = (handlers: unknown): HydrationHandlers => {
  assertPlainRecord(handlers);
  const captured = Object.create(null) as Record<PropertyKey, unknown>;
  const eventNames = new Set<string>(Object.values(RetikzEvent));
  for (const identifier of Reflect.ownKeys(handlers)) {
    if (typeof identifier !== 'string') return invalidRuntimeInput(handlers);
    const elementHandlers = readDataProperty(handlers, identifier);
    assertPlainRecord(elementHandlers);
    const capturedElement = Object.create(null) as Record<PropertyKey, unknown>;
    for (const eventName of Reflect.ownKeys(elementHandlers)) {
      if (typeof eventName !== 'string' || !eventNames.has(eventName)) {
        return invalidRuntimeInput(elementHandlers);
      }
      const handler = readDataProperty(elementHandlers, eventName);
      if (typeof handler !== 'function') return invalidRuntimeInput(elementHandlers);
      defineCapturedValue(capturedElement, eventName, handler);
    }
    defineCapturedValue(captured, identifier, capturedElement);
  }
  return captured as HydrationHandlers;
};

const captureRegistry = <TValue>(
  value: unknown,
  captureEntry: (entry: unknown) => TValue,
): Record<string, TValue> | undefined => {
  if (value === undefined) return undefined;
  assertPlainRecord(value);
  const captured = Object.create(null) as Record<PropertyKey, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return invalidRuntimeInput(value);
    defineCapturedValue(captured, key, captureEntry(readDataProperty(value, key)));
  }
  return captured as Record<string, TValue>;
};

const captureEasing = (entry: unknown): EasingRegistry[string] => {
  if (typeof entry === 'function') return entry as EasingRegistry[string];
  const tuple = captureDenseArray(entry);
  if (
    tuple === undefined ||
    tuple.length !== 4 ||
    !tuple.every(item => typeof item === 'number' && Number.isFinite(item))
  ) {
    return invalidRuntimeInput(entry);
  }
  return tuple as EasingRegistry[string];
};

const captureAnimationProperty = (entry: unknown): AnimationPropertyRegistry[string] => {
  assertPlainRecord(entry);
  assertAllowedKeys(entry, new Set(['interpolate', 'applyCanvas']));
  const interpolate = readDataProperty(entry, 'interpolate');
  const applyCanvas = readDataProperty(entry, 'applyCanvas');
  if (typeof interpolate !== 'function' || typeof applyCanvas !== 'function') return invalidRuntimeInput(entry);
  return {
    interpolate: interpolate as AnimationPropertyRegistry[string]['interpolate'],
    applyCanvas: applyCanvas as AnimationPropertyRegistry[string]['applyCanvas'],
  };
};

const normalizeContributions = (value: unknown): ReadonlyArray<RenderHandlerContribution> | undefined => {
  if (value === undefined) return undefined;
  const captured = captureDenseArray(value);
  if (captured === undefined) return invalidRuntimeInput(value);
  const registrations = new Set<number>();
  const contributions = captured.map(candidate => {
    assertPlainRecord(candidate);
    assertAllowedKeys(candidate, new Set(['registration', 'handlers']));
    const registration = readDataProperty(candidate, 'registration');
    const handlers = readDataProperty(candidate, 'handlers');
    if (
      typeof registration !== 'number' ||
      !Number.isSafeInteger(registration) ||
      registration < 0 ||
      registrations.has(registration)
    ) {
      return invalidRuntimeInput(candidate);
    }
    registrations.add(registration);
    return { registration, handlers: captureHandlers(handlers) };
  });
  return contributions.sort((left, right) => left.registration - right.registration);
};

const captureRuntimeConfig = (input: RenderRuntimeConfigInput): RenderRuntimeConfig => {
  try {
    const candidate: unknown = input;
    assertPlainRecord(candidate);
    assertAllowedKeys(candidate, new Set(['handlerContributions', 'animation', 'canvas', 'cachePolicy']));
    const cachePolicy = Object.hasOwn(candidate, 'cachePolicy')
      ? readDataProperty(candidate, 'cachePolicy')
      : undefined;
    if (
      cachePolicy !== undefined &&
      !Object.values(RenderCachePolicy).includes(cachePolicy as RenderCachePolicyValue)
    ) {
      return invalidRuntimeInput(input);
    }
    const contributions = normalizeContributions(
      Object.hasOwn(candidate, 'handlerContributions')
        ? readDataProperty(candidate, 'handlerContributions')
        : undefined,
    );
    const animation = Object.hasOwn(candidate, 'animation') ? readDataProperty(candidate, 'animation') : undefined;
    let normalizedAnimation: RenderRuntimeConfigInput['animation'];
    if (animation !== undefined) {
      assertPlainRecord(animation);
      assertAllowedKeys(animation, new Set(['enabled', 'snapshotAt', 'easings', 'properties']));
      const enabled = Object.hasOwn(animation, 'enabled') ? readDataProperty(animation, 'enabled') : undefined;
      const snapshotAt = Object.hasOwn(animation, 'snapshotAt') ? readDataProperty(animation, 'snapshotAt') : undefined;
      const easings = captureRegistry(
        Object.hasOwn(animation, 'easings') ? readDataProperty(animation, 'easings') : undefined,
        captureEasing,
      );
      const properties = captureRegistry(
        Object.hasOwn(animation, 'properties') ? readDataProperty(animation, 'properties') : undefined,
        captureAnimationProperty,
      );
      if (enabled !== undefined && typeof enabled !== 'boolean') return invalidRuntimeInput(animation);
      if (
        snapshotAt !== undefined &&
        (typeof snapshotAt !== 'number' || !Number.isFinite(snapshotAt) || snapshotAt < 0)
      ) {
        return invalidRuntimeInput(animation);
      }
      normalizedAnimation = {
        ...(enabled === undefined ? {} : { enabled }),
        ...(snapshotAt === undefined ? {} : { snapshotAt }),
        ...(easings === undefined ? {} : { easings }),
        ...(properties === undefined ? {} : { properties }),
      };
    }
    const canvas = Object.hasOwn(candidate, 'canvas') ? readDataProperty(candidate, 'canvas') : undefined;
    let normalizedCanvas: RenderRuntimeConfigInput['canvas'];
    if (canvas !== undefined) {
      assertPlainRecord(canvas);
      assertAllowedKeys(canvas, new Set(['width', 'height']));
      const width = Object.hasOwn(canvas, 'width') ? readDataProperty(canvas, 'width') : undefined;
      const height = Object.hasOwn(canvas, 'height') ? readDataProperty(canvas, 'height') : undefined;
      if (width !== undefined && (typeof width !== 'number' || !Number.isFinite(width) || width < 0)) {
        return invalidRuntimeInput(canvas);
      }
      if (height !== undefined && (typeof height !== 'number' || !Number.isFinite(height) || height < 0)) {
        return invalidRuntimeInput(canvas);
      }
      normalizedCanvas = {
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
      };
    }
    const normalized = {
      ...(contributions === undefined ? {} : { handlerContributions: contributions }),
      ...(normalizedAnimation === undefined ? {} : { animation: normalizedAnimation }),
      ...(normalizedCanvas === undefined ? {} : { canvas: normalizedCanvas }),
      ...(cachePolicy === undefined ? {} : { cachePolicy: cachePolicy as RenderCachePolicyValue }),
    };
    return cloneAndFreezeRuntimeValue(normalized);
  } catch (cause) {
    if (isRetikzRetainedRenderError(cause)) throw cause;
    return invalidRuntimeInput(cause);
  }
};

/** Render runtime config 的 Runtime owner Definition */
export const RenderRuntimeOwnerDefinition: RuntimeOwnerDefinition<
  RenderRuntimeConfigInput,
  RenderRuntimeConfig,
  RenderRuntimeConfig,
  never
> = defineRuntimeOwner<RenderRuntimeConfigInput, RenderRuntimeConfig, RenderRuntimeConfig, never>({
  key: RENDER_RUNTIME_OWNER_KEY,
  value: {
    capture: captureRuntimeConfig,
    read: value => value,
    equals: runtimeStructuralEquals,
  },
});
