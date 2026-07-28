import type { RuntimeDeepReadonly } from '@retikz/core';
import type { RuntimeOwnerDefinition } from '@retikz/runtime';

import { defineRuntimeOwner } from '@retikz/runtime';

import type { AnimationPropertyRegistry, EasingRegistry } from '../animation';
import type { HydrationHandlers } from '../hydration';

import { RetikzEvent } from '../hydration';
import { isRetainedRenderError, RetainedRenderError, RetainedRenderErrorCode } from './error';
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
  /** layer cache 策略 */
  cachePolicy?: RenderCachePolicyValue;
}>;

/** Session-owned deeply immutable renderer 配置 */
export type RenderRuntimeConfig = RuntimeDeepReadonly<RenderRuntimeConfigInput>;

const invalidRuntimeInput = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid, cause });
};

const isDenseArray = (value: unknown): value is ReadonlyArray<unknown> => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) return false;
  }
  return true;
};

const assertPlainRecord: (value: unknown) => asserts value is Record<PropertyKey, unknown> = value => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !isPlainObject(value)) {
    return invalidRuntimeInput(value);
  }
};

const assertAllowedKeys = (value: object, allowed: ReadonlySet<string>): void => {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) return invalidRuntimeInput(value);
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
    const elementHandlers = Reflect.get(handlers, identifier);
    assertPlainRecord(elementHandlers);
    const capturedElement = Object.create(null) as Record<PropertyKey, unknown>;
    for (const eventName of Reflect.ownKeys(elementHandlers)) {
      const handler = Reflect.get(elementHandlers, eventName);
      if (typeof eventName !== 'string' || !eventNames.has(eventName) || typeof handler !== 'function') {
        return invalidRuntimeInput(elementHandlers);
      }
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
    defineCapturedValue(captured, key, captureEntry(Reflect.get(value, key)));
  }
  return captured as Record<string, TValue>;
};

const captureEasing = (entry: unknown): EasingRegistry[string] => {
  if (typeof entry === 'function') return entry as EasingRegistry[string];
  if (
    !isDenseArray(entry) ||
    entry.length !== 4 ||
    !entry.every(item => typeof item === 'number' && Number.isFinite(item))
  ) {
    return invalidRuntimeInput(entry);
  }
  return [...entry] as EasingRegistry[string];
};

const captureAnimationProperty = (entry: unknown): AnimationPropertyRegistry[string] => {
  assertPlainRecord(entry);
  assertAllowedKeys(entry, new Set(['interpolate', 'applyCanvas']));
  const interpolate = Reflect.get(entry, 'interpolate');
  const applyCanvas = Reflect.get(entry, 'applyCanvas');
  if (typeof interpolate !== 'function' || typeof applyCanvas !== 'function') return invalidRuntimeInput(entry);
  return {
    interpolate: interpolate as AnimationPropertyRegistry[string]['interpolate'],
    applyCanvas: applyCanvas as AnimationPropertyRegistry[string]['applyCanvas'],
  };
};

const normalizeContributions = (value: unknown): ReadonlyArray<RenderHandlerContribution> | undefined => {
  if (value === undefined) return undefined;
  if (!isDenseArray(value)) return invalidRuntimeInput(value);
  const registrations = new Set<number>();
  const contributions = value.map(candidate => {
    assertPlainRecord(candidate);
    assertAllowedKeys(candidate, new Set(['registration', 'handlers']));
    const registration = Reflect.get(candidate, 'registration');
    const handlers = Reflect.get(candidate, 'handlers');
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
    assertAllowedKeys(candidate, new Set(['handlerContributions', 'animation', 'cachePolicy']));
    const cachePolicy = Reflect.get(candidate, 'cachePolicy');
    if (
      cachePolicy !== undefined &&
      !Object.values(RenderCachePolicy).includes(cachePolicy as RenderCachePolicyValue)
    ) {
      return invalidRuntimeInput(input);
    }
    const contributions = normalizeContributions(Reflect.get(candidate, 'handlerContributions'));
    const animation = Reflect.get(candidate, 'animation');
    let normalizedAnimation: RenderRuntimeConfigInput['animation'];
    if (animation !== undefined) {
      assertPlainRecord(animation);
      assertAllowedKeys(animation, new Set(['enabled', 'snapshotAt', 'easings', 'properties']));
      const enabled = Reflect.get(animation, 'enabled');
      const snapshotAt = Reflect.get(animation, 'snapshotAt');
      const easings = captureRegistry(Reflect.get(animation, 'easings'), captureEasing);
      const properties = captureRegistry(Reflect.get(animation, 'properties'), captureAnimationProperty);
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
    const normalized = {
      ...(contributions === undefined ? {} : { handlerContributions: contributions }),
      ...(normalizedAnimation === undefined ? {} : { animation: normalizedAnimation }),
      ...(cachePolicy === undefined ? {} : { cachePolicy: cachePolicy as RenderCachePolicyValue }),
    };
    return cloneAndFreezeRuntimeValue(normalized);
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
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
