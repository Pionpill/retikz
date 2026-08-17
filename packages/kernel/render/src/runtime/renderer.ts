import type { ScenePatch } from '@retikz/core';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import type { AnimationControls } from '../animation';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot } from './frame';

import { isRetikzRetainedRenderError, RetikzRetainedRenderError, RetikzRetainedRenderErrorCode } from './error';

/** Retained renderer 增量能力等级 */
export const RetainedRendererCapability = {
  None: 'none',
  Group: 'group',
  Entity: 'entity',
} as const;

/** Retained renderer 增量能力等级取值 */
export type RetainedRendererCapabilityValue =
  (typeof RetainedRendererCapability)[keyof typeof RetainedRendererCapability];

/** Retained renderer 对只读 Scene 图层的支持等级 */
export const RetainedRendererReadonlyLayerCapability = {
  Supported: 'supported',
  Unsupported: 'unsupported',
} as const;

/** Retained renderer 只读 Scene 图层支持等级取值 */
export type RetainedRendererReadonlyLayerCapabilityValue =
  (typeof RetainedRendererReadonlyLayerCapability)[keyof typeof RetainedRendererReadonlyLayerCapability];

/** Retained renderer 支持的宿主元素 */
export type RetainedRendererHost = SVGSVGElement | HTMLCanvasElement;

/** SVG renderer 的 session-lifetime immutable options */
export type RetainedSvgRendererImmutableOptions = Readonly<{
  /** renderer backend */
  backend: 'svg';
  /** 资源与 descriptor id 前缀 */
  idPrefix: string;
}>;

/** Canvas renderer 的 session-lifetime immutable options */
export type RetainedCanvasRendererImmutableOptions = Readonly<{
  /** renderer backend */
  backend: 'canvas';
  /** 资源与 descriptor id 前缀 */
  idPrefix: string;
  /** mount 时固定的设备像素比 */
  devicePixelRatio?: number;
}>;

/** Retained renderer 的 session-lifetime immutable options */
export type RetainedRendererImmutableOptions =
  | RetainedSvgRendererImmutableOptions
  | RetainedCanvasRendererImmutableOptions;

/** 与一次 committed renderer state 对应的 immutable public read */
export type RetainedRendererRead = Readonly<{
  /** renderer 当前原子物化的主图与只读图层 */
  frame: RenderFrameSnapshot;
  /** 与同一 revision 对应的动画控制器 */
  animation?: AnimationControls;
}>;

/** Retained renderer 私有 executor 公共作者契约 */
export type RetainedRendererDefinitionBase = Readonly<{
  /** renderer 支持的最大增量粒度 */
  capability: RetainedRendererCapabilityValue;
  /** renderer 是否能物化只读 Scene 图层 */
  readonlyLayerCapability: RetainedRendererReadonlyLayerCapabilityValue;
  /** staging 首次 materialization */
  prepareMount: (
    frame: RenderFrameSnapshot,
    config: RenderRuntimeConfig,
    mode: 'create' | 'adopt',
  ) => RuntimePreparedCommit;
  /** staging 一次 Patch 与 config 原子更新 */
  prepare: (patch: ScenePatch, frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => RuntimePreparedCommit;
  /** 读取已 commit 的 renderer state */
  read: () => RetainedRendererRead;
  /** 释放 renderer 与 host 资源 */
  dispose: () => void;
}>;

/** SVG retained renderer 作者输入 */
export type RetainedSvgRendererDefinitionInput = RetainedRendererDefinitionBase &
  Readonly<{ backend: 'svg'; host: SVGSVGElement }>;

/** Canvas retained renderer 作者输入 */
export type RetainedCanvasRendererDefinitionInput = RetainedRendererDefinitionBase &
  Readonly<{ backend: 'canvas'; host: HTMLCanvasElement }>;

/** Retained renderer 作者输入 */
export type RetainedRendererDefinitionInput =
  | RetainedSvgRendererDefinitionInput
  | RetainedCanvasRendererDefinitionInput;

declare const RetainedRendererBrand: unique symbol;

/** Retained renderer nominal token 的共享字段 */
export type RetainedRendererTokenBase = Readonly<{
  /** renderer 增量能力 */
  capability: RetainedRendererCapabilityValue;
  /** renderer 只读 Scene 图层支持等级 */
  readonlyLayerCapability: RetainedRendererReadonlyLayerCapabilityValue;
  /** nominal brand */
  [RetainedRendererBrand]: true;
}>;

/** SVG retained renderer nominal token */
export type RetainedSvgRenderer = RetainedRendererTokenBase & Readonly<{ backend: 'svg'; host: SVGSVGElement }>;

/** Canvas retained renderer nominal token */
export type RetainedCanvasRenderer = RetainedRendererTokenBase &
  Readonly<{ backend: 'canvas'; host: HTMLCanvasElement }>;

/** Retained renderer nominal token */
export type RetainedRenderer = RetainedSvgRenderer | RetainedCanvasRenderer;

/** Retained renderer factory 的判别输入 */
export type RetainedRendererFactoryInput =
  | Readonly<{
      backend: 'svg';
      host: SVGSVGElement;
      immutableOptions: RetainedSvgRendererImmutableOptions;
    }>
  | Readonly<{
      backend: 'canvas';
      host: HTMLCanvasElement;
      immutableOptions: RetainedCanvasRendererImmutableOptions;
    }>;

/** Adapter 可注入的 retained renderer factory */
export type RetainedRendererFactory = {
  /** 创建 SVG retained renderer */
  (input: Extract<RetainedRendererFactoryInput, Readonly<{ backend: 'svg' }>>): RetainedSvgRenderer;
  /** 创建 Canvas retained renderer */
  (input: Extract<RetainedRendererFactoryInput, Readonly<{ backend: 'canvas' }>>): RetainedCanvasRenderer;
};

/** Render 私有 renderer executor */
export type RetainedRendererExecutor = Readonly<{
  prepareMount: RetainedRendererDefinitionBase['prepareMount'];
  prepare: RetainedRendererDefinitionBase['prepare'];
  read: RetainedRendererDefinitionBase['read'];
  dispose: RetainedRendererDefinitionBase['dispose'];
}>;

const retainedRenderers = new WeakSet<object>();
const retainedRendererExecutors = new WeakMap<object, RetainedRendererExecutor>();

/** 判断动态宿主是否为 SVGSVGElement，兼容跨 realm 与无 DOM 构造器测试环境 */
export const isSvgHost = (value: unknown): value is SVGSVGElement => {
  if (typeof value !== 'object' || value === null) return false;
  const constructor = (globalThis as { SVGSVGElement?: typeof SVGSVGElement }).SVGSVGElement;
  if (constructor !== undefined) {
    if (value instanceof constructor) return true;
    const realmConstructor = Reflect.get(Reflect.get(value, 'ownerDocument') ?? {}, 'defaultView')?.SVGSVGElement;
    return typeof realmConstructor === 'function' && value instanceof realmConstructor;
  }
  return Reflect.get(value, 'tagName')?.toString().toLowerCase() === 'svg';
};

/** 判断动态宿主是否为 HTMLCanvasElement，兼容跨 realm 与无 DOM 构造器测试环境 */
export const isCanvasHost = (value: unknown): value is HTMLCanvasElement => {
  if (typeof value !== 'object' || value === null) return false;
  const constructor = (globalThis as { HTMLCanvasElement?: typeof HTMLCanvasElement }).HTMLCanvasElement;
  if (constructor !== undefined) {
    if (value instanceof constructor) return true;
    const realmConstructor = Reflect.get(Reflect.get(value, 'ownerDocument') ?? {}, 'defaultView')?.HTMLCanvasElement;
    return typeof realmConstructor === 'function' && value instanceof realmConstructor;
  }
  return Reflect.get(value, 'tagName')?.toString().toLowerCase() === 'canvas';
};

/** nominal retained renderer define helper 的判别重载 */
export type DefineRetainedRenderer = {
  /** 定义 SVG retained renderer */
  (input: RetainedSvgRendererDefinitionInput): RetainedSvgRenderer;
  /** 定义 Canvas retained renderer */
  (input: RetainedCanvasRendererDefinitionInput): RetainedCanvasRenderer;
};

const defineRetainedRendererUnsafe = (input: RetainedRendererDefinitionInput): RetainedRenderer => {
  const candidate: unknown = input;
  if (typeof candidate !== 'object' || candidate === null) {
    throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause: input });
  }
  const backend = Reflect.get(candidate, 'backend');
  const host = Reflect.get(candidate, 'host');
  const capability = Reflect.get(candidate, 'capability');
  const readonlyLayerCapability = Reflect.get(candidate, 'readonlyLayerCapability');
  const prepareMount = Reflect.get(candidate, 'prepareMount');
  const prepare = Reflect.get(candidate, 'prepare');
  const read = Reflect.get(candidate, 'read');
  const dispose = Reflect.get(candidate, 'dispose');
  const validHost = backend === 'svg' ? isSvgHost(host) : backend === 'canvas' && isCanvasHost(host);
  const validCapability = Object.values(RetainedRendererCapability).includes(
    capability as RetainedRendererCapabilityValue,
  );
  const validReadonlyLayerCapability = Object.values(RetainedRendererReadonlyLayerCapability).includes(
    readonlyLayerCapability as RetainedRendererReadonlyLayerCapabilityValue,
  );
  if (
    !validHost ||
    !validCapability ||
    !validReadonlyLayerCapability ||
    typeof prepareMount !== 'function' ||
    typeof prepare !== 'function' ||
    typeof read !== 'function' ||
    typeof dispose !== 'function'
  ) {
    throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause: input });
  }
  const token = Object.freeze({
    backend,
    host,
    capability,
    readonlyLayerCapability,
  }) as RetainedRenderer;
  let state: 'live' | 'disposing' | 'disposed' = 'live';
  const assertLive = (): void => {
    if (state !== 'live')
      throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererDisposed });
  };
  retainedRendererExecutors.set(
    token,
    Object.freeze({
      prepareMount: (...arguments_) => {
        assertLive();
        return (prepareMount as RetainedRendererDefinitionBase['prepareMount'])(...arguments_);
      },
      prepare: (...arguments_) => {
        assertLive();
        return (prepare as RetainedRendererDefinitionBase['prepare'])(...arguments_);
      },
      read: () => {
        assertLive();
        return (read as RetainedRendererDefinitionBase['read'])();
      },
      dispose: () => {
        if (state === 'disposed') return;
        state = 'disposing';
        (dispose as RetainedRendererDefinitionBase['dispose'])();
        state = 'disposed';
      },
    }),
  );
  retainedRenderers.add(token);
  return token;
};

const defineRetainedRendererImplementation = (input: RetainedRendererDefinitionInput): RetainedRenderer => {
  try {
    return defineRetainedRendererUnsafe(input);
  } catch (cause) {
    if (isRetikzRetainedRenderError(cause)) throw cause;
    throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause });
  }
};

/** 定义 nominal retained renderer */
export const defineRetainedRenderer = defineRetainedRendererImplementation as DefineRetainedRenderer;

/** 判断动态值是否为当前 Render 实例创建的 renderer token */
export const isRetainedRenderer = (value: unknown): value is RetainedRenderer =>
  typeof value === 'object' && value !== null && retainedRenderers.has(value);

/** 读取 nominal renderer 的 Render 私有 executor */
export const getRetainedRendererExecutor = (renderer: RetainedRenderer): RetainedRendererExecutor | undefined =>
  retainedRendererExecutors.get(renderer);
