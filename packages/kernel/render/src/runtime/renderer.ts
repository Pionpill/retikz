import type { ScenePatch } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import type { AnimationControls } from '../animation';
import { isRetikzRenderError, RetikzRenderError, RetikzRenderErrorCode } from '../error';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot } from './frame';

/** Retained renderer 增量能力等级 */
export const RetainedRendererCapability = {
  None: 'none',
  Group: 'group',
  Entity: 'entity',
} as const;

/** Retained renderer 增量能力等级取值 */
export type RetainedRendererCapability = ValueOf<typeof RetainedRendererCapability>;

/** Retained renderer 对只读 Scene 图层的支持等级 */
export const RetainedRendererReadonlyLayerCapability = {
  Supported: 'supported',
  Unsupported: 'unsupported',
} as const;

/** Retained renderer 只读 Scene 图层支持等级取值 */
export type RetainedRendererReadonlyLayerCapability = ValueOf<typeof RetainedRendererReadonlyLayerCapability>;

/** Retained renderer 支持的宿主元素 */
export type RetainedRendererHost = SVGSVGElement | HTMLCanvasElement;

/** SVG renderer 的 session-lifetime immutable options */
export type RetainedSvgRendererImmutableOptions = Readonly<{
  /** 渲染后端种类 */
  backend: 'svg';
  /** 资源与 descriptor id 前缀 */
  idPrefix: string;
}>;

/** Canvas renderer 的 session-lifetime immutable options */
export type RetainedCanvasRendererImmutableOptions = Readonly<{
  /** 渲染后端种类 */
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
  capability: RetainedRendererCapability;
  /** renderer 是否能物化只读 Scene 图层 */
  readonlyLayerCapability: RetainedRendererReadonlyLayerCapability;
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
  Readonly<{
    /** 标识 SVG 渲染后端 */
    backend: 'svg';
    /** 当前渲染器持有的 SVG 根元素 */
    host: SVGSVGElement;
  }>;

/** Canvas retained renderer 作者输入 */
export type RetainedCanvasRendererDefinitionInput = RetainedRendererDefinitionBase &
  Readonly<{
    /** 标识 Canvas 渲染后端 */
    backend: 'canvas';
    /** 当前渲染器持有的 Canvas 根元素 */
    host: HTMLCanvasElement;
  }>;

/** Retained renderer 作者输入 */
export type RetainedRendererDefinitionInput =
  | RetainedSvgRendererDefinitionInput
  | RetainedCanvasRendererDefinitionInput;

declare const RetainedRendererBrand: unique symbol;

/** Retained renderer nominal token 的共享字段 */
export type RetainedRendererTokenBase = Readonly<{
  /** renderer 增量能力 */
  capability: RetainedRendererCapability;
  /** renderer 只读 Scene 图层支持等级 */
  readonlyLayerCapability: RetainedRendererReadonlyLayerCapability;
  /** 用于区分名义类型的不透明标记 */
  [RetainedRendererBrand]: true;
}>;

/** 保留式 SVG 渲染器的名义类型令牌 */
export type RetainedSvgRenderer = RetainedRendererTokenBase &
  Readonly<{
    /** 标识 SVG 渲染后端 */
    backend: 'svg';
    /** 当前渲染器关联的稳定 SVG 根元素 */
    host: SVGSVGElement;
  }>;

/** 保留式 Canvas 渲染器的名义类型令牌 */
export type RetainedCanvasRenderer = RetainedRendererTokenBase &
  Readonly<{
    /** 标识 Canvas 渲染后端 */
    backend: 'canvas';
    /** 当前渲染器关联的稳定 Canvas 根元素 */
    host: HTMLCanvasElement;
  }>;

/** 保留式渲染器的名义类型令牌 */
export type RetainedRenderer = RetainedSvgRenderer | RetainedCanvasRenderer;

/** Retained renderer factory 的判别输入 */
export type RetainedRendererFactoryInput =
  | Readonly<{
      /** 选择与宿主元素匹配的渲染后端 */
      backend: 'svg';
      /** 工厂创建的渲染器所关联的根元素 */
      host: SVGSVGElement;
      /** 该挂载生命周期内固定的后端参数 */
      immutableOptions: RetainedSvgRendererImmutableOptions;
    }>
  | Readonly<{
      /** 选择与宿主元素匹配的渲染后端 */
      backend: 'canvas';
      /** 工厂创建的渲染器所关联的根元素 */
      host: HTMLCanvasElement;
      /** 该挂载生命周期内固定的后端参数 */
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
  /** 准备首次场景挂载，返回可提交和回滚的事务 */
  prepareMount: RetainedRendererDefinitionBase['prepareMount'];
  /** 准备场景补丁与运行时配置的原子更新 */
  prepare: RetainedRendererDefinitionBase['prepare'];
  /** 读取已提交的渲染帧与动画状态 */
  read: RetainedRendererDefinitionBase['read'];
  /** 释放渲染器持有的宿主资源 */
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
  const { backend, host, capability, readonlyLayerCapability, prepareMount, prepare, read, dispose } = input;
  const runtimeBackend: unknown = backend;
  const validHost = runtimeBackend === 'svg' ? isSvgHost(host) : runtimeBackend === 'canvas' && isCanvasHost(host);
  if (!validHost) {
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererInvalid, cause: input });
  }

  const token = Object.freeze({
    backend,
    host,
    capability,
    readonlyLayerCapability,
  }) as RetainedRenderer;
  let state: 'live' | 'disposing' | 'disposed' = 'live';

  const assertLive = (): void => {
    if (state !== 'live') throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererDisposed });
  };

  retainedRendererExecutors.set(
    token,
    Object.freeze({
      prepareMount: (...arguments_) => {
        assertLive();
        return prepareMount(...arguments_);
      },
      prepare: (...arguments_) => {
        assertLive();
        return prepare(...arguments_);
      },
      read: () => {
        assertLive();
        return read();
      },
      dispose: () => {
        if (state === 'disposed') return;

        state = 'disposing';
        dispose();
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
    if (isRetikzRenderError(cause)) throw cause;
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererInvalid, cause });
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
