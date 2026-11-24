import type { ValueOf } from '@retikz/foundation';
import type { ReconcilerPreparedCommit } from '@retikz/reconciler';

import type { AnimationControls } from '../animation';
import { isRetikzRenderError, RetikzRenderError, RetikzRenderErrorCode } from '../error';
import type { ScenePatch } from '../scene';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot } from './frame';

/** renderer 增量能力等级 */
export const RendererCapability = {
  None: 'none',
  Group: 'group',
  Entity: 'entity',
} as const;

/** renderer 增量能力等级取值 */
export type RendererCapability = ValueOf<typeof RendererCapability>;

/** renderer 对只读 Scene 图层的支持等级 */
export const RendererReadonlyLayerCapability = {
  Supported: 'supported',
  Unsupported: 'unsupported',
} as const;

/** renderer 只读 Scene 图层支持等级取值 */
export type RendererReadonlyLayerCapability = ValueOf<typeof RendererReadonlyLayerCapability>;

/** renderer 支持的宿主元素 */
export type RendererHost = SVGSVGElement | HTMLCanvasElement;

/** SVG renderer 的 session-lifetime immutable options */
export type SvgRendererImmutableOptions = Readonly<{
  /** 渲染后端种类 */
  backend: 'svg';
  /** 资源与 descriptor id 前缀 */
  idPrefix: string;
}>;

/** Canvas renderer 的 session-lifetime immutable options */
export type CanvasRendererImmutableOptions = Readonly<{
  /** 渲染后端种类 */
  backend: 'canvas';
  /** 资源与 descriptor id 前缀 */
  idPrefix: string;
  /** mount 时固定的设备像素比 */
  devicePixelRatio?: number;
}>;

/** renderer 的 session-lifetime immutable options */
export type RendererImmutableOptions = SvgRendererImmutableOptions | CanvasRendererImmutableOptions;

/** 与一次 committed renderer state 对应的 immutable public read */
export type RendererRead = Readonly<{
  /** renderer 当前原子物化的主图与只读图层 */
  frame: RenderFrameSnapshot;
  /** 与同一 revision 对应的动画控制器 */
  animation?: AnimationControls;
}>;

/** renderer 私有 executor 公共作者契约 */
export type RendererDefinitionBase = Readonly<{
  /** renderer 支持的最大增量粒度 */
  capability: RendererCapability;
  /** renderer 是否能物化只读 Scene 图层 */
  readonlyLayerCapability: RendererReadonlyLayerCapability;
  /** staging 首次 materialization */
  prepareMount: (
    frame: RenderFrameSnapshot,
    config: RenderRuntimeConfig,
    mode: 'create' | 'adopt',
  ) => ReconcilerPreparedCommit;
  /** staging 一次 Patch 与 config 原子更新 */
  prepare: (patch: ScenePatch, frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => ReconcilerPreparedCommit;
  /** 读取已 commit 的 renderer state */
  read: () => RendererRead;
  /** 释放 renderer 与 host 资源 */
  dispose: () => void;
}>;

/** SVG renderer 作者输入 */
export type InputSvgRendererDefinition = RendererDefinitionBase &
  Readonly<{
    /** 标识 SVG 渲染后端 */
    backend: 'svg';
    /** 当前渲染器持有的 SVG 根元素 */
    host: SVGSVGElement;
  }>;

/** Canvas renderer 作者输入 */
export type InputCanvasRendererDefinition = RendererDefinitionBase &
  Readonly<{
    /** 标识 Canvas 渲染后端 */
    backend: 'canvas';
    /** 当前渲染器持有的 Canvas 根元素 */
    host: HTMLCanvasElement;
  }>;

/** renderer 作者输入 */
export type InputRendererDefinition = InputSvgRendererDefinition | InputCanvasRendererDefinition;

declare const rendererBrand: unique symbol;

/** renderer nominal token 的共享字段 */
export type RendererTokenBase = Readonly<{
  /** renderer 增量能力 */
  capability: RendererCapability;
  /** renderer 只读 Scene 图层支持等级 */
  readonlyLayerCapability: RendererReadonlyLayerCapability;
  /** 用于区分名义类型的不透明标记 */
  [rendererBrand]: true;
}>;

/** 保留式 SVG 渲染器的名义类型令牌 */
export type SvgRenderer = RendererTokenBase &
  Readonly<{
    /** 标识 SVG 渲染后端 */
    backend: 'svg';
    /** 当前渲染器关联的稳定 SVG 根元素 */
    host: SVGSVGElement;
  }>;

/** 保留式 Canvas 渲染器的名义类型令牌 */
export type CanvasRenderer = RendererTokenBase &
  Readonly<{
    /** 标识 Canvas 渲染后端 */
    backend: 'canvas';
    /** 当前渲染器关联的稳定 Canvas 根元素 */
    host: HTMLCanvasElement;
  }>;

/** 保留式渲染器的名义类型令牌 */
export type Renderer = SvgRenderer | CanvasRenderer;

/** renderer factory 的判别输入 */
export type InputRendererFactory =
  | Readonly<{
      /** 选择与宿主元素匹配的渲染后端 */
      backend: 'svg';
      /** 工厂创建的渲染器所关联的根元素 */
      host: SVGSVGElement;
      /** 该挂载生命周期内固定的后端参数 */
      immutableOptions: SvgRendererImmutableOptions;
    }>
  | Readonly<{
      /** 选择与宿主元素匹配的渲染后端 */
      backend: 'canvas';
      /** 工厂创建的渲染器所关联的根元素 */
      host: HTMLCanvasElement;
      /** 该挂载生命周期内固定的后端参数 */
      immutableOptions: CanvasRendererImmutableOptions;
    }>;

/** Adapter 可注入的 renderer factory */
export type RendererFactory = {
  /** 创建 SVG renderer */
  (input: Extract<InputRendererFactory, Readonly<{ backend: 'svg' }>>): SvgRenderer;
  /** 创建 Canvas renderer */
  (input: Extract<InputRendererFactory, Readonly<{ backend: 'canvas' }>>): CanvasRenderer;
};

/** Render 私有 renderer executor */
type RendererExecutor = Pick<RendererDefinitionBase, 'prepareMount' | 'prepare' | 'read' | 'dispose'>;

const renderers = new WeakSet<object>();

const rendererExecutors = new WeakMap<object, RendererExecutor>();

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

/** nominal renderer define helper 的判别重载 */
export type DefineRenderer = {
  /** 定义 SVG renderer */
  (input: InputSvgRendererDefinition): SvgRenderer;
  /** 定义 Canvas renderer */
  (input: InputCanvasRendererDefinition): CanvasRenderer;
};

const defineRendererUnsafe = (input: InputRendererDefinition): Renderer => {
  const { backend, host, capability, readonlyLayerCapability, prepareMount, prepare, read, dispose } = input;
  const runtimeBackend: unknown = backend;
  const validHost = runtimeBackend === 'svg' ? isSvgHost(host) : runtimeBackend === 'canvas' && isCanvasHost(host);
  if (!validHost) {
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RuntimeRendererInvalid, cause: input });
  }

  const token = Object.freeze({
    backend,
    host,
    capability,
    readonlyLayerCapability,
  }) as Renderer;
  let state: 'live' | 'disposing' | 'disposed' = 'live';

  const assertLive = (): void => {
    if (state !== 'live') throw new RetikzRenderError({ code: RetikzRenderErrorCode.RuntimeRendererDisposed });
  };

  rendererExecutors.set(
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
  renderers.add(token);

  return token;
};

const defineRendererImplementation = (input: InputRendererDefinition): Renderer => {
  try {
    return defineRendererUnsafe(input);
  } catch (cause) {
    if (isRetikzRenderError(cause)) throw cause;
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RuntimeRendererInvalid, cause });
  }
};

/** 定义 nominal renderer */
export const defineRenderer = defineRendererImplementation as DefineRenderer;

/** 判断动态值是否为当前 Render 实例创建的 renderer token */
export const isRenderer = (value: unknown): value is Renderer =>
  typeof value === 'object' && value !== null && renderers.has(value);

/** 读取 nominal renderer 的 Render 私有 executor */
export const getRendererExecutor = (renderer: Renderer): RendererExecutor | undefined =>
  rendererExecutors.get(renderer);
