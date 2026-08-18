import type { RuntimeScenePrimitive, Scene, ScenePatch, SceneRuntimeSnapshot } from '@retikz/core';
import type { RuntimeIdentity, RuntimePreparedCommit } from '@retikz/runtime';

import { RetikzError } from '@retikz/foundation';
import { runtimeIdentityEquals } from '@retikz/runtime';

import type { AnimationControls, IdClockRegistry } from '../animation';
import type { PrimAnimationResolution } from '../canvas';
import type { HydrationAnimationControls, HydrationController, HydrationTarget } from '../hydration';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot } from './frame';
import type { RenderReadonlyLayer } from './readonly-layer';
import type { RetainedCanvasRenderer, RetainedCanvasRendererImmutableOptions } from './renderer';
import type { SceneAnimationDescriptorDiff } from './runtime-options';
import type { RuntimeIdentityMap } from './shared';

import {
  createClock,
  createIdClockRegistry,
  sceneAnimationDurationMs,
  sceneHasAnimations,
  sceneHasAutoplayTrigger,
} from '../animation';
import { hitTest, renderFrameToCanvas, renderToCanvas } from '../canvas';
import { RetikzRenderError, RetikzRenderErrorCode } from '../error';
import {
  collectCanvasVisibleAnimationIds,
  createCanvasIdAnimationControls,
  createClockAnimationControls,
  createContextBuilder,
  createHydrationController,
  isCanvasAnimationIdVisible,
  withCanvasAnimationEventHandlers,
} from '../hydration';
import { pathBounds } from '../shared';
import { mergeRenderHandlers } from './handlers';
import { validateReadonlyLayers } from './readonly-layer';
import { defineRetainedRenderer } from './renderer';
import {
  diffSceneAnimationDescriptors,
  materializeEasingRegistry,
  SceneAnimationOccurrenceChangeKind,
} from './runtime-options';
import {
  createHydrationCleanupQueue,
  createPublicIdPrimitivePathMap,
  createRuntimeIdentityMap,
  createSemanticOwnerPublicIdMap,
  recoverHydrationSetupFailure,
  runBestEffortCleanup,
  runtimeStructuralEquals,
} from './shared';

const asScene = (snapshot: SceneRuntimeSnapshot): Scene => snapshot.scene as unknown as Scene;

/** 按 snapshot primitive path 读取 exact occurrence */
const primitiveAtPath = (
  snapshot: SceneRuntimeSnapshot,
  path: ReadonlyArray<number>,
): RuntimeScenePrimitive | undefined => {
  let primitives = snapshot.scene.primitives;
  for (let depth = 0; depth < path.length; depth += 1) {
    const candidate: unknown = Reflect.get(primitives, path[depth]);
    if (typeof candidate !== 'object' || candidate === null) return undefined;
    const primitive = candidate as RuntimeScenePrimitive;
    if (depth === path.length - 1) return primitive;
    if (primitive.type !== 'group') return undefined;
    primitives = primitive.children;
  }
  return undefined;
};

/** 读取单个 occurrence 自身动画 descriptor 的有限结束时刻 */
const primitiveAnimationDurationMs = (primitive: RuntimeScenePrimitive): number | null =>
  sceneAnimationDurationMs({
    layout: { x: 0, y: 0, width: 0, height: 0 },
    resources: [],
    animations: [],
    primitives: [
      primitive.type === 'group'
        ? ({ ...(primitive as unknown as Scene['primitives'][number]), children: [] } as Scene['primitives'][number])
        : (primitive as unknown as Scene['primitives'][number]),
    ],
  });

/** 判断 readonly Runtime descriptor 集合是否含 load / 缺省自动播放 track */
const runtimeAnimationsHaveAutoplay = (
  animations: RuntimeScenePrimitive['animations'] | SceneRuntimeSnapshot['scene']['animations'],
): boolean => animations?.some(track => track.trigger === undefined || track.trigger === 'load') === true;

/** Canvas retained 局部重绘使用的 Scene 坐标包围盒 */
type CanvasBounds = Readonly<{ x: number; y: number; width: number; height: number }>;

/** 顶层稳定 occurrence 与其保守绘制范围 */
type CanvasDisplayItem = Readonly<{
  /** 顶层 occurrence 的稳定 Runtime identity */
  identity: RuntimeIdentity;
  /** 当前 lineage 中的顶层 primitive */
  primitive: RuntimeScenePrimitive;
  /** 覆盖 stroke、shadow 与 transform 的保守失效范围 */
  bounds: CanvasBounds;
}>;

/** Canvas 动画帧使用的 identity-tokenized Scene 与逐 occurrence clock resolver */
type CanvasAnimationFrame = Readonly<{
  /** primitive id 已替换为 renderer 私有 occurrence token 的 Scene */
  scene: Scene;
  /** 把 coarse clock 折算为独立 Scene root timeline 时刻 */
  resolveRootAnimationTime: (time: number) => number;
  /** 按 occurrence token 解析本帧动画状态 */
  resolvePrimAnimation: (id: string | undefined, time: number) => PrimAnimationResolution;
}>;

/** Canvas 动画 candidate 在 bitmap staging 与 commit 间共享的状态 */
type CanvasAnimationCandidate = CanvasAnimationFrame &
  Readonly<{
    /** 发布 candidate registry/Scene/clock，并返回 transaction rollback */
    commit: () => () => void;
  }>;

/** Canvas animation Scene 的 RuntimeIdentity 与 public id 索引 */
type CanvasAnimationOccurrenceIndex = Readonly<{
  /** 用 renderer 私有 occurrence token 替换 primitive id 的 Scene */
  scene: Scene;
  /** RuntimeIdentity 到私有 occurrence token */
  tokenByIdentity: RuntimeIdentityMap<string>;
  /** public id 到全部 occurrence token，供显式 hydration id 控制 */
  tokensByPublicId: ReadonlyMap<string, ReadonlyArray<string>>;
}>;

/** 一次 committed Canvas 动画的 clock、per-occurrence controls 与重绘生命周期 */
type CanvasAnimationState = Readonly<{
  /** 全场景共享 coarse clock */
  controls: AnimationControls;
  /** 创建绑定命中 RuntimeIdentity 的 hydration 控制器 */
  makeHydrationControls: (target: HydrationTarget) => HydrationAnimationControls;
  /** 按已确定的 public id 创建控制器，供合成 enter/leave context 保持 previous target 语义 */
  makeHydrationControlsForPublicId: (publicId: string) => HydrationAnimationControls;
  /** 构造不触碰 committed state 的 candidate Scene/registry */
  stage: (
    snapshot: SceneRuntimeSnapshot,
    layers: ReadonlyArray<RenderReadonlyLayer>,
    config: RenderRuntimeConfig,
    diff: SceneAnimationDescriptorDiff,
  ) => CanvasAnimationCandidate;
  /** 以当前 clock state 重绘 committed Scene */
  renderFrame: () => void;
  /** 在候选 commit 中暂时关闭旧 controls，并返回原 running 状态 */
  suspend: () => boolean;
  /** rollback 时恢复旧 controls 可见性与 running 状态 */
  resume: (running: boolean) => void;
  /** 释放 clock 与可见性监听 */
  dispose: () => void;
}>;

/** Canvas visibility 注册与初次清理同时失败时的错误 */
class RetikzCanvasVisibilitySetupError extends RetikzError<
  typeof RetikzRenderErrorCode.CanvasVisibilitySetupFailed,
  Readonly<{ cleanupCause: unknown }>
> {
  /** 原始 visibility listener 注册失败 */
  override readonly cause: unknown;

  /** 初次 visibility teardown 失败 */
  readonly cleanupCause: unknown;

  /** 创建保留 primary setup cause 的 visibility 错误 */
  constructor(cause: unknown, cleanupCause: unknown) {
    super({
      code: RetikzRenderErrorCode.CanvasVisibilitySetupFailed,
      message: 'Canvas visibility setup and cleanup failed',
      details: { cleanupCause },
      cause,
    });
    this.cause = cause;
    this.cleanupCause = cleanupCause;
  }
}

/** Canvas animation 构建失败且清理仍失败时的可恢复错误 */
class RetikzCanvasAnimationSetupError extends RetikzError<
  typeof RetikzRenderErrorCode.CanvasAnimationSetupFailed,
  Readonly<{ cleanupCause: unknown; state: CanvasAnimationState }>
> {
  /** 原始 animation 构建失败 */
  override readonly cause: unknown;

  /** 初次 animation cleanup 失败 */
  readonly cleanupCause: unknown;

  /** 保留尚未清理资源的 state，供 renderer 最终 dispose 重试 */
  readonly state: CanvasAnimationState;

  /** 创建保留 primary setup cause 与可重试 state 的错误 */
  constructor(cause: unknown, cleanupCause: unknown, state: CanvasAnimationState) {
    super({
      code: RetikzRenderErrorCode.CanvasAnimationSetupFailed,
      message: 'Canvas animation setup and cleanup failed',
      details: { cleanupCause, state },
      cause,
    });
    this.cause = cause;
    this.cleanupCause = cleanupCause;
    this.state = state;
  }
}

/** Canvas clock candidate 与内部恢复同时失败时的可重试错误 */
class RetikzCanvasAnimationCommitRecoveryError extends RetikzError<
  typeof RetikzRenderErrorCode.CanvasAnimationCommitRecoveryFailed,
  Readonly<{ rollbackCause: unknown; retryRollback: () => void }>
> {
  /** 原始 candidate clock 切换失败 */
  override readonly cause: unknown;

  /** 同次恢复 committed clock 的失败 */
  readonly rollbackCause: unknown;

  /** prepared rollback 继续恢复 committed clock 的重试入口 */
  readonly retryRollback: () => void;

  /** 创建保留 trigger primary 与 rollback 重试入口的错误 */
  constructor(cause: unknown, rollbackCause: unknown, retryRollback: () => void) {
    super({
      code: RetikzRenderErrorCode.CanvasAnimationCommitRecoveryFailed,
      message: 'Canvas animation clock replacement and recovery failed',
      details: { rollbackCause, retryRollback },
      cause,
    });
    this.cause = cause;
    this.rollbackCause = rollbackCause;
    this.retryRollback = retryRollback;
  }
}

/** 跨 prepared token 保留失败 Canvas animation state 的清理队列 */
type CanvasAnimationCleanupQueue = Readonly<{
  /** 尝试清理 state；失败时保留到 pending 队列 */
  dispose: (state: CanvasAnimationState) => void;
  /** 直接保留已确认初次清理失败的 state */
  retain: (state: CanvasAnimationState) => void;
  /** best-effort 重试全部 pending state */
  disposePending: () => void;
}>;

/** 创建 renderer 生命周期内的 Canvas animation 清理队列 */
const createCanvasAnimationCleanupQueue = (): CanvasAnimationCleanupQueue => {
  const pending = new Set<CanvasAnimationState>();
  const dispose = (state: CanvasAnimationState): void => {
    try {
      state.dispose();
      pending.delete(state);
    } catch (cause) {
      pending.add(state);
      throw cause;
    }
  };
  const retain = (state: CanvasAnimationState): void => {
    pending.add(state);
  };
  const disposePending = (): void => {
    runBestEffortCleanup([...pending].map(state => () => dispose(state)));
  };
  return Object.freeze({ dispose, retain, disposePending });
};

/** 恢复 Canvas animation setup 双重失败中的 primary cause 与 retryable state */
const recoverCanvasAnimationSetupFailure = (
  cause: unknown,
): Readonly<{ cause: unknown; state: CanvasAnimationState }> | undefined => {
  if (!(cause instanceof RetikzCanvasAnimationSetupError)) return undefined;
  return Object.freeze({ cause: cause.cause, state: cause.state });
};

/** 按资源地址读取 renderer-lifetime image cache */
type CanvasImageResolver = (href: string) => CanvasImageSource | null;

/** Canvas image candidate 的事务式资源引用 */
type CanvasImageStage = Readonly<{
  /** 只读取 candidate 已声明的 image */
  getImage: CanvasImageResolver;
  /** 发布 candidate consumer 集合 */
  commit: () => void;
  /** 恢复旧 consumer 并释放 candidate-only image */
  rollback: () => void;
  /** 成功事务结束后释放旧 consumer */
  dispose: () => void;
}>;

/** Canvas image cache 的读取与释放协议 */
type CanvasImageLoader = Readonly<{
  /** 读取 committed image cache */
  getImage: CanvasImageResolver;
  /** 为 candidate consumer 集合建立事务式资源引用 */
  stage: (hrefs: ReadonlySet<string>) => CanvasImageStage;
  /** 释放 renderer-lifetime image cache */
  dispose: () => void;
}>;

/** 创建 renderer-lifetime image resource cache，并在资源 ready 后请求重绘 */
const createCanvasImageLoader = (onReady: () => void): CanvasImageLoader => {
  const entries = new Map<string, Readonly<{ image: HTMLImageElement; loaded: () => boolean }>>();
  let active = true;
  let committed = new Set<string>();
  const ensure = (href: string): void => {
    if (entries.has(href) || typeof Image === 'undefined') return;
    const image = new Image();
    let loaded = false;
    image.onload = () => {
      loaded = true;
      if (active && committed.has(href)) onReady();
    };
    image.onerror = () => undefined;
    entries.set(href, Object.freeze({ image, loaded: () => loaded }));
    image.src = href;
  };
  const getImage: CanvasImageResolver = href => {
    ensure(href);
    const entry = entries.get(href);
    return entry?.loaded() === true ? entry.image : null;
  };
  const release = (href: string): void => {
    const entry = entries.get(href);
    if (entry === undefined) return;
    entry.image.onload = null;
    entry.image.onerror = null;
    entries.delete(href);
  };
  return Object.freeze({
    getImage,
    stage: hrefs => {
      const created = new Set<string>();
      const requestedBeforeReady = new Set<string>();
      const previous = new Set(committed);
      try {
        for (const href of hrefs) {
          if (!entries.has(href)) created.add(href);
          ensure(href);
        }
      } catch (cause) {
        for (const href of created) if (!committed.has(href)) release(href);
        throw cause;
      }
      let didCommit = false;
      let didRollback = false;
      return Object.freeze({
        getImage: (href: string) => {
          if (!hrefs.has(href)) return null;
          const image = getImage(href);
          if (image === null && entries.has(href)) requestedBeforeReady.add(href);
          return image;
        },
        commit: () => {
          if (didCommit || didRollback) return;
          didCommit = true;
          committed = new Set(hrefs);
          if (
            active &&
            [...requestedBeforeReady].some(href => committed.has(href) && entries.get(href)?.loaded() === true)
          ) {
            onReady();
          }
        },
        rollback: () => {
          if (didRollback) return;
          didRollback = true;
          if (didCommit) committed = previous;
          for (const href of created) if (!committed.has(href)) release(href);
        },
        dispose: () => {
          if (!didCommit || didRollback) return;
          for (const href of previous) if (!committed.has(href)) release(href);
        },
      });
    },
    dispose: () => {
      if (!active) return;
      active = false;
      for (const { image } of entries.values()) {
        image.onload = null;
        image.onerror = null;
      }
      entries.clear();
      committed.clear();
    },
  });
};

/** 收集完整 frame 当前由 paint resource 消费的 image href */
const collectCanvasImageHrefs = (
  snapshot: SceneRuntimeSnapshot,
  layers: ReadonlyArray<RenderReadonlyLayer>,
): ReadonlySet<string> =>
  new Set(
    [snapshot.scene, ...layers.map(layer => layer.scene)].flatMap(scene =>
      (scene.resources ?? []).flatMap(resource =>
        resource.kind === 'paint' && resource.spec.kind === 'image' ? [resource.spec.href] : [],
      ),
    ),
  );

/** Full 与 incremental bitmap 必须继承的宿主 CSS 绘制上下文 */
type CanvasHostStyle = Readonly<{
  defaultFontFamily?: string;
  currentColor?: string;
}>;

/** 读取 host 当前的字体族与 currentColor，供离屏 bitmap 保持 full parity */
const readCanvasHostStyle = (host: HTMLCanvasElement): CanvasHostStyle => {
  if (typeof getComputedStyle === 'undefined') return {};
  const style = getComputedStyle(host);
  const defaultFontFamily = style.fontFamily.trim();
  const currentColor = style.color.trim();
  return {
    ...(defaultFontFamily.length === 0 ? {} : { defaultFontFamily }),
    ...(currentColor.length === 0 ? {} : { currentColor }),
  };
};

const unionBounds = (left: CanvasBounds | undefined, right: CanvasBounds): CanvasBounds => {
  if (left === undefined) return right;
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: maxX - x, height: maxY - y };
};

const expandBounds = (bounds: CanvasBounds, amount: number): CanvasBounds => ({
  x: bounds.x - amount,
  y: bounds.y - amount,
  width: bounds.width + amount * 2,
  height: bounds.height + amount * 2,
});

/** 计算可安全局部重绘的保守 ink bounds，不可证明时返回 undefined 触发 full */
const primitiveBounds = (primitive: RuntimeScenePrimitive): CanvasBounds | undefined => {
  const candidate = primitive as RuntimeScenePrimitive & Readonly<Record<string, unknown>>;
  if (
    Reflect.get(candidate, 'shadow') !== undefined ||
    Reflect.get(candidate, 'clipRef') !== undefined ||
    Reflect.get(candidate, 'arrowStart') !== undefined ||
    Reflect.get(candidate, 'arrowEnd') !== undefined ||
    (primitive.animations?.length ?? 0) > 0
  ) {
    return undefined;
  }
  if (primitive.type === 'group') {
    if ((primitive.transforms?.length ?? 0) > 0) return undefined;
    let bounds: CanvasBounds | undefined;
    for (const child of primitive.children) {
      const childBounds = primitiveBounds(child);
      if (childBounds === undefined) return undefined;
      bounds = unionBounds(bounds, childBounds);
    }
    return bounds;
  }
  let bounds: CanvasBounds;
  switch (primitive.type) {
    case 'rect':
      bounds = { x: primitive.x, y: primitive.y, width: primitive.width, height: primitive.height };
      break;
    case 'ellipse':
      bounds = {
        x: primitive.cx - primitive.rx,
        y: primitive.cy - primitive.ry,
        width: primitive.rx * 2,
        height: primitive.ry * 2,
      };
      if (primitive.rotate !== undefined && primitive.rotate !== 0) return undefined;
      break;
    case 'text': {
      const x =
        primitive.align === 'middle'
          ? primitive.x - primitive.measuredWidth / 2
          : primitive.align === 'end'
            ? primitive.x - primitive.measuredWidth
            : primitive.x;
      const y =
        primitive.baseline === 'top'
          ? primitive.y
          : primitive.baseline === 'middle'
            ? primitive.y - primitive.measuredHeight / 2
            : primitive.y - primitive.measuredHeight;
      bounds = expandBounds(
        { x, y, width: primitive.measuredWidth, height: primitive.measuredHeight },
        primitive.fontSize,
      );
      break;
    }
    case 'path': {
      const path = pathBounds(primitive.commands as unknown as Parameters<typeof pathBounds>[0]);
      bounds = { x: path.x, y: path.y, width: path.w, height: path.h };
      break;
    }
  }
  const strokeWidth = Reflect.get(candidate, 'strokeWidth');
  const strokeExpansion =
    typeof strokeWidth === 'number' && Number.isFinite(strokeWidth)
      ? primitive.type === 'path'
        ? strokeWidth * 5
        : strokeWidth
      : 0;
  return expandBounds(bounds, strokeExpansion);
};

/** 按 primitivePath 建立顶层 display list，不依赖 topology 数组排列 */
const buildDisplayList = (snapshot: SceneRuntimeSnapshot): ReadonlyArray<CanvasDisplayItem> | undefined => {
  if (snapshot.scene.resources.length > 0 || snapshot.scene.animations.length > 0) return undefined;
  const topologyByIndex = new Map(
    snapshot.topology.flatMap(node =>
      node.primitivePath.length === 1 ? ([[node.primitivePath[0], node]] as const) : [],
    ),
  );
  if (topologyByIndex.size !== snapshot.scene.primitives.length) return undefined;
  const items: Array<CanvasDisplayItem> = [];
  for (let index = 0; index < snapshot.scene.primitives.length; index += 1) {
    const primitive = snapshot.scene.primitives[index];
    const node = topologyByIndex.get(index);
    const bounds = primitiveBounds(primitive);
    if (node === undefined || bounds === undefined) return undefined;
    items.push(Object.freeze({ identity: node.identity, primitive, bounds }));
  }
  return Object.freeze(items);
};

const boundsIntersect = (left: CanvasBounds, right: CanvasBounds): boolean =>
  left.x <= right.x + right.width &&
  left.x + left.width >= right.x &&
  left.y <= right.y + right.height &&
  left.y + left.height >= right.y;

/** 把稳定顶层 update Patch 解释为候选 display list 与新旧 dirty union */
const prepareDisplayListUpdate = (
  current: ReadonlyArray<CanvasDisplayItem> | undefined,
  patch: ScenePatch | undefined,
): Readonly<{ items: ReadonlyArray<CanvasDisplayItem>; dirty: CanvasBounds }> | undefined => {
  if (current === undefined || patch === undefined || patch.operations.length === 0) return undefined;
  if (!patch.operations.every(operation => operation.kind === 'update')) return undefined;
  const byIdentity = createRuntimeIdentityMap(current.map((item, index) => [item.identity, index] as const));
  const candidate = [...current];
  let dirty: CanvasBounds | undefined;
  for (const operation of patch.operations) {
    const index = byIdentity.get(operation.identity);
    const bounds = primitiveBounds(operation.subtree.primitive);
    if (index === undefined || bounds === undefined) return undefined;
    const previous = candidate[index];
    candidate[index] = Object.freeze({ identity: operation.identity, primitive: operation.subtree.primitive, bounds });
    dirty = unionBounds(dirty, unionBounds(previous.bounds, bounds));
  }
  return dirty === undefined ? undefined : Object.freeze({ items: Object.freeze(candidate), dirty });
};

/** Canvas transaction 的目标设备像素尺寸 */
type CanvasBitmapSize = Readonly<{ width: number; height: number }>;

/** 按 committed Scene 与 transaction config 解析目标设备像素尺寸 */
const resolveCanvasBitmapSize = (
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  options: RetainedCanvasRendererImmutableOptions,
): CanvasBitmapSize => {
  const ratio = resolvedDevicePixelRatio(options);
  return Object.freeze({
    width: Math.max(1, Math.round((config.canvas?.width ?? snapshot.scene.layout.width) * ratio)),
    height: Math.max(1, Math.round((config.canvas?.height ?? snapshot.scene.layout.height) * ratio)),
  });
};

/** 将完整 snapshot 绘制到目标尺寸的候选离屏 bitmap */
const createBitmap = (
  host: HTMLCanvasElement,
  size: CanvasBitmapSize,
  snapshot: SceneRuntimeSnapshot,
  layers: ReadonlyArray<RenderReadonlyLayer>,
  config: RenderRuntimeConfig,
  options: RetainedCanvasRendererImmutableOptions,
  hostStyle: CanvasHostStyle,
  time: number | undefined,
  animationFrame: CanvasAnimationFrame | undefined,
  getImage: CanvasImageResolver,
): HTMLCanvasElement => {
  const bitmap = host.ownerDocument.createElement('canvas');
  bitmap.width = size.width;
  bitmap.height = size.height;
  renderFrameToCanvas(
    bitmap,
    { primary: animationFrame?.scene ?? asScene(snapshot), layers },
    {
      devicePixelRatio: options.devicePixelRatio,
      time,
      ...(animationFrame === undefined
        ? {}
        : { rootAnimationTime: animationFrame.resolveRootAnimationTime(time ?? 0) }),
      ...(animationFrame === undefined
        ? {}
        : { resolvePrimAnimation: (id: string | undefined) => animationFrame.resolvePrimAnimation(id, time ?? 0) }),
      animationProperties: config.animation?.properties,
      easings: materializeEasingRegistry(config),
      defaultFontFamily: hostStyle.defaultFontFamily,
      currentColor: hostStyle.currentColor,
      getImage,
    },
  );
  return bitmap;
};

const resolvedDevicePixelRatio = (options: RetainedCanvasRendererImmutableOptions): number => {
  if (options.devicePixelRatio !== undefined) return options.devicePixelRatio;
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

/** Canvas 增量事务使用的候选像素、回滚像素与设备像素区域 */
type CanvasDirtyBitmap = Readonly<{
  kind: 'dirty';
  /** 与 host 同尺寸、只在 dirty region 内物化候选像素的透明位图 */
  bitmap: HTMLCanvasElement;
  /** 只包含提交前 dirty region 像素的 region-size 回滚位图 */
  rollback: HTMLCanvasElement;
  /** 在 host 与 full-size bitmap 上使用的 device-pixel 坐标区域 */
  region: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

/** Canvas 增量事务的像素工作；完全离屏时只提交逻辑状态 */
type CanvasIncrementalBitmap =
  | CanvasDirtyBitmap
  | Readonly<{
      kind: 'offscreen';
    }>;

/** 只 staging dirty region，并按原 z-order 重放相交项 */
const createIncrementalBitmap = (
  host: HTMLCanvasElement,
  committedBitmap: HTMLCanvasElement,
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  options: RetainedCanvasRendererImmutableOptions,
  hostStyle: CanvasHostStyle,
  time: number | undefined,
  animationFrame: CanvasAnimationFrame | undefined,
  getImage: CanvasImageResolver,
  update: Readonly<{ items: ReadonlyArray<CanvasDisplayItem>; dirty: CanvasBounds }>,
): CanvasIncrementalBitmap => {
  const ratio = resolvedDevicePixelRatio(options);
  const layout = snapshot.scene.layout;
  const cssWidth = host.width / ratio;
  const cssHeight = host.height / ratio;
  const scale = Math.min(cssWidth / layout.width, cssHeight / layout.height);
  const offsetX = (cssWidth - layout.width * scale) / 2;
  const offsetY = (cssHeight - layout.height * scale) / 2;
  const x = Math.floor((offsetX + (update.dirty.x - layout.x) * scale) * ratio) - 2;
  const y = Math.floor((offsetY + (update.dirty.y - layout.y) * scale) * ratio) - 2;
  const maxX = Math.ceil((offsetX + (update.dirty.x + update.dirty.width - layout.x) * scale) * ratio) + 2;
  const maxY = Math.ceil((offsetY + (update.dirty.y + update.dirty.height - layout.y) * scale) * ratio) + 2;
  const region = Object.freeze({
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(0, Math.min(host.width, maxX) - Math.max(0, x)),
    height: Math.max(0, Math.min(host.height, maxY) - Math.max(0, y)),
  });
  if (region.width === 0 || region.height === 0) {
    return Object.freeze({ kind: 'offscreen' });
  }
  const bitmap = host.ownerDocument.createElement('canvas');
  bitmap.width = host.width;
  bitmap.height = host.height;
  const context = bitmap.getContext('2d');
  if (context === null)
    throw new RetikzRenderError(
      RetikzRenderErrorCode.Runtime,
      'Canvas retained renderer cannot acquire an incremental 2D context',
    );
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.beginPath();
  context.rect(region.x, region.y, region.width, region.height);
  context.clip();
  context.clearRect(region.x, region.y, region.width, region.height);
  const primitives = update.items
    .filter(item => boundsIntersect(item.bounds, update.dirty))
    .map(item => item.primitive as unknown as Scene['primitives'][number]);
  renderToCanvas(
    bitmap,
    { ...(snapshot.scene as unknown as Scene), primitives },
    {
      clear: false,
      devicePixelRatio: options.devicePixelRatio,
      time,
      ...(animationFrame === undefined
        ? {}
        : { rootAnimationTime: animationFrame.resolveRootAnimationTime(time ?? 0) }),
      ...(animationFrame === undefined
        ? {}
        : { resolvePrimAnimation: (id: string | undefined) => animationFrame.resolvePrimAnimation(id, time ?? 0) }),
      animationProperties: config.animation?.properties,
      easings: materializeEasingRegistry(config),
      defaultFontFamily: hostStyle.defaultFontFamily,
      currentColor: hostStyle.currentColor,
      getImage,
    },
  );
  context.restore();
  const rollback = host.ownerDocument.createElement('canvas');
  rollback.width = region.width;
  rollback.height = region.height;
  const rollbackContext = rollback.getContext('2d');
  if (rollbackContext === null)
    throw new RetikzRenderError(
      RetikzRenderErrorCode.Runtime,
      'Canvas retained renderer cannot capture the dirty rollback region',
    );
  rollbackContext.drawImage(
    committedBitmap,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );
  return Object.freeze({ kind: 'dirty', bitmap, rollback, region });
};

/** 把候选 bitmap 同步交换到 host */
const paintBitmap = (host: HTMLCanvasElement, bitmap: HTMLCanvasElement | undefined): void => {
  const context = host.getContext('2d');
  if (context === null)
    throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas retained renderer cannot acquire a 2D context');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, host.width, host.height);
  if (bitmap !== undefined) context.drawImage(bitmap, 0, 0);
};

/** 把 full-size candidate 或 region-size rollback 的 dirty pixels 交换到目标 bitmap */
const paintBitmapRegion = (
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
  region: CanvasDirtyBitmap['region'],
  sourceKind: 'full' | 'region',
): void => {
  const context = target.getContext('2d');
  if (context === null)
    throw new RetikzRenderError(
      RetikzRenderErrorCode.Runtime,
      'Canvas retained renderer cannot acquire a dirty 2D context',
    );
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(region.x, region.y, region.width, region.height);
  const sourceX = sourceKind === 'full' ? region.x : 0;
  const sourceY = sourceKind === 'full' ? region.y : 0;
  context.drawImage(
    source,
    sourceX,
    sourceY,
    region.width,
    region.height,
    region.x,
    region.y,
    region.width,
    region.height,
  );
};

/** 捕获 host 当前像素，供 commit 中途失败时回滚 */
const captureBitmap = (host: HTMLCanvasElement): HTMLCanvasElement => {
  const bitmap = host.ownerDocument.createElement('canvas');
  bitmap.width = host.width;
  bitmap.height = host.height;
  const context = bitmap.getContext('2d');
  if (context === null)
    throw new RetikzRenderError(
      RetikzRenderErrorCode.Runtime,
      'Canvas retained renderer cannot capture the committed bitmap',
    );
  context.drawImage(host, 0, 0);
  return bitmap;
};

const resolveCanvasPoint = (
  host: HTMLCanvasElement,
  snapshot: SceneRuntimeSnapshot,
  event: Event,
): { x: number; y: number } | undefined => {
  const mouse = event as MouseEvent;
  if (typeof mouse.clientX !== 'number') return undefined;
  const bounds = host.getBoundingClientRect();
  const layout = snapshot.scene.layout;
  const scale = Math.min(bounds.width / layout.width, bounds.height / layout.height);
  if (!Number.isFinite(scale) || scale <= 0) return undefined;
  return {
    x: (mouse.clientX - bounds.left - (bounds.width - layout.width * scale) / 2) / scale + layout.x,
    y: (mouse.clientY - bounds.top - (bounds.height - layout.height * scale) / 2) / scale + layout.y,
  };
};

/** 创建与当前 snapshot、handlers、per-id animation 对应的 Canvas hydration */
const createCanvasHydration = (
  host: HTMLCanvasElement,
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  animation: CanvasAnimationState | undefined,
): HydrationController | undefined => {
  const scene = asScene(snapshot);
  const topologyByPath = new Map(snapshot.topology.map(node => [node.primitivePath.join('.'), node]));
  const publicIdByOwner = createSemanticOwnerPublicIdMap(snapshot.topology);
  const primitivePathsByPublicId = createPublicIdPrimitivePathMap(snapshot.topology);
  /** 给内部 trigger collector 注入与 hydration target 相同的 semantic-owner public id 口径 */
  const stampAnimationOwners = (
    primitive: RuntimeScenePrimitive,
    path: ReadonlyArray<number>,
  ): Scene['primitives'][number] => {
    const topology = topologyByPath.get(path.join('.'));
    if (topology === undefined)
      throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas hydration topology is incomplete');
    const publicId = topology.publicId ?? publicIdByOwner.get(topology.semanticOwner);
    return {
      ...(primitive as unknown as Scene['primitives'][number]),
      ...(publicId === undefined ? {} : { id: publicId }),
      ...(primitive.type === 'group'
        ? { children: primitive.children.map((child, index) => stampAnimationOwners(child, [...path, index])) }
        : {}),
    };
  };
  const animationOwnerScene: Scene = {
    ...scene,
    primitives: snapshot.scene.primitives.map((primitive, index) => stampAnimationOwners(primitive, [index])),
  };
  const handlers = withCanvasAnimationEventHandlers(animationOwnerScene, mergeRenderHandlers(config));
  if (Object.keys(handlers).length === 0) return undefined;
  const targets = new Map<string, HydrationTarget>();
  const stamp = (primitive: RuntimeScenePrimitive, path: ReadonlyArray<number>): Scene['primitives'][number] => {
    const token = path.join('.');
    const topology = topologyByPath.get(token);
    if (topology === undefined)
      throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas hydration topology is incomplete');
    targets.set(
      token,
      Object.freeze({
        identity: topology.identity,
        semanticOwner: topology.semanticOwner,
        ...(topology.publicId === undefined && publicIdByOwner.get(topology.semanticOwner) === undefined
          ? {}
          : { publicId: topology.publicId ?? publicIdByOwner.get(topology.semanticOwner) }),
      }),
    );
    return {
      ...(primitive as unknown as Scene['primitives'][number]),
      id: token,
      ...(primitive.type === 'group'
        ? { children: primitive.children.map((child, index) => stamp(child, [...path, index])) }
        : {}),
    };
  };
  const hitScene: Scene = {
    ...scene,
    primitives: snapshot.scene.primitives.map((primitive, index) => stamp(primitive, [index])),
  };
  const locateTarget = (event: Event): HydrationTarget | null => {
    const point = resolveCanvasPoint(host, snapshot, event);
    const context = host.getContext('2d') ?? undefined;
    context?.setTransform(1, 0, 0, 1, 0, 0);
    if (point === undefined) return null;
    const token = hitTest(hitScene, point, { context2d: context });
    return token === null ? null : (targets.get(token) ?? null);
  };
  return createHydrationController(
    host,
    handlers,
    locateTarget,
    createContextBuilder({
      renderer: 'canvas',
      root: host,
      scene,
      resolvePrimitivePaths: id => primitivePathsByPublicId.get(id),
      resolveElement: () => null,
      resolvePoint: event => resolveCanvasPoint(host, snapshot, event) ?? null,
      makeAnimation: id => animation?.makeHydrationControlsForPublicId(id) ?? createClockAnimationControls(undefined),
    }),
    'canvas',
  );
};

/** 为 Canvas animation runtime 建立稳定 occurrence token 与内部 Scene */
const createCanvasAnimationOccurrenceIndex = (
  snapshot: SceneRuntimeSnapshot,
  previous: CanvasAnimationOccurrenceIndex | undefined,
  allocateToken: () => string,
): CanvasAnimationOccurrenceIndex => {
  const tokenByIdentity = createRuntimeIdentityMap<string>([]);
  const tokenByPath = new Map<string, string>();
  const tokensByPublicId = new Map<string, Array<string>>();
  const publicIdByOwner = createSemanticOwnerPublicIdMap(snapshot.topology);
  for (const node of snapshot.topology) {
    const token = previous?.tokenByIdentity.get(node.identity) ?? allocateToken();
    if (!tokenByIdentity.set(node.identity, token))
      throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas animation topology has duplicate identity');
    tokenByPath.set(node.primitivePath.join('.'), token);
    const publicId = node.publicId ?? publicIdByOwner.get(node.semanticOwner);
    if (publicId !== undefined) {
      const tokens = tokensByPublicId.get(publicId) ?? [];
      tokens.push(token);
      tokensByPublicId.set(publicId, tokens);
    }
  }
  const stamp = (primitive: RuntimeScenePrimitive, path: ReadonlyArray<number>): Scene['primitives'][number] => {
    const token = tokenByPath.get(path.join('.'));
    if (token === undefined)
      throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas animation topology is incomplete');
    return {
      ...(primitive as unknown as Scene['primitives'][number]),
      id: token,
      ...(primitive.type === 'group'
        ? { children: primitive.children.map((child, index) => stamp(child, [...path, index])) }
        : {}),
    };
  };
  return Object.freeze({
    scene: {
      ...(snapshot.scene as unknown as Scene),
      primitives: snapshot.scene.primitives.map((primitive, index) => stamp(primitive, [index])),
    },
    tokenByIdentity,
    tokensByPublicId: new Map(
      Array.from(tokensByPublicId, ([publicId, tokens]) => [publicId, Object.freeze(tokens)] as const),
    ),
  });
};

/** 创建共享 coarse clock 与独立 per-id clock registry 驱动的 Canvas 动画 */
const createCanvasAnimation = (
  host: HTMLCanvasElement,
  snapshot: SceneRuntimeSnapshot,
  layers: ReadonlyArray<RenderReadonlyLayer>,
  config: RenderRuntimeConfig,
  options: RetainedCanvasRendererImmutableOptions,
  getImage: CanvasImageResolver,
): CanvasAnimationState | undefined => {
  if (
    config.animation?.enabled === false ||
    config.animation?.snapshotAt !== undefined ||
    !sceneHasAnimations(asScene(snapshot))
  ) {
    return undefined;
  }
  let tokenSequence = 0;
  const allocateToken = (): string => `retikz-canvas-animation-${tokenSequence++}`;
  let occurrenceIndex = createCanvasAnimationOccurrenceIndex(snapshot, undefined, allocateToken);
  let scene = occurrenceIndex.scene;
  let currentLayers = layers;
  let animationConfig = config;
  let registry: IdClockRegistry = createIdClockRegistry();
  let timelineEndByToken = new Map<string, number | null>();
  let rootTimelineStart = 0;
  let clock: AnimationControls;
  let clockEnd: number | null = 0;
  let visibleTeardown: (() => void) | undefined;
  let coarsePlayRequested = false;
  let enabled = true;
  let cleanupStarted = false;
  let cleanupInProgress = false;
  let disposed = false;
  let clockDisposed = false;
  let clockReplacementInProgress = false;
  /** 外部 animation callback 返回后重新读取 renderer animation gate */
  const isAnimationStateActive = (): boolean => enabled && !cleanupStarted;
  const resolveWithRegistry = (candidate: IdClockRegistry, id: string | undefined, time: number) =>
    id !== undefined && candidate.isStopped(id)
      ? ({ mode: 'skip' } as const)
      : ({
          mode: 'at',
          time: candidate.timeFor(id, time),
          includeNonAutoplay: candidate.isActive(id),
        } as const);
  const renderFrame = (time = clock.time): void => {
    if (!enabled || cleanupStarted) return;
    renderFrameToCanvas(
      host,
      { primary: scene, layers: currentLayers },
      {
        devicePixelRatio: options.devicePixelRatio,
        time,
        rootAnimationTime: Math.max(0, time - rootTimelineStart),
        animationProperties: animationConfig.animation?.properties,
        easings: materializeEasingRegistry(animationConfig),
        resolvePrimAnimation: id => resolveWithRegistry(registry, id, time),
        getImage,
      },
    );
  };
  const bindVisibility = (): void => {
    visibleTeardown?.();
    visibleTeardown = undefined;
    const visibleIds = collectCanvasVisibleAnimationIds(scene);
    if (!enabled || cleanupStarted || visibleIds.size === 0 || typeof window === 'undefined') return;
    const activated = new Set(Array.from(visibleIds).filter(id => registry.isActive(id)));
    let scheduled: number | undefined;
    let scheduleInProgress = false;
    const activate = (): void => {
      scheduled = undefined;
      if (!enabled || cleanupStarted) return;
      let changed = false;
      for (const id of visibleIds) {
        if (activated.has(id) || !isCanvasAnimationIdVisible(host, scene, id)) continue;
        registry.restart(id, clock.time);
        activated.add(id);
        changed = true;
      }
      if (changed) {
        ensureActiveTimelinesPlaying();
        renderFrame();
      }
    };
    /** 外部 rAF 注册前后都重新读取 visibility gate */
    const canSchedule = (): boolean => enabled && !cleanupStarted;
    type ListenerRegistration = { state: 'idle' | 'registering' | 'registered'; cleanupRequested: boolean };
    const scrollRegistration: ListenerRegistration = { state: 'idle', cleanupRequested: false };
    const resizeRegistration: ListenerRegistration = { state: 'idle', cleanupRequested: false };
    /** 外部 listener 注册返回后重新读取 registration 与 visibility gate */
    const canPublishListener = (registration: ListenerRegistration): boolean =>
      !registration.cleanupRequested && canSchedule();
    /** 清理 listener；注册尚未返回时先关闭发布资格，由注册方在返回后接管清理 */
    const removeListener = (registration: ListenerRegistration, remove: () => void): void => {
      if (registration.state === 'idle') return;
      if (registration.state === 'registering') {
        registration.cleanupRequested = true;
        return;
      }
      remove();
      registration.state = 'idle';
      registration.cleanupRequested = false;
    };
    const teardown = (): void => {
      runBestEffortCleanup([
        () => removeListener(scrollRegistration, () => window.removeEventListener('scroll', schedule, true)),
        () => removeListener(resizeRegistration, () => window.removeEventListener('resize', schedule)),
        () => {
          const frame = scheduled;
          if (frame === undefined) return;
          window.cancelAnimationFrame(frame);
          if (scheduled === frame) scheduled = undefined;
        },
      ]);
    };
    /** 注册 listener，并在注册期间同步 cleanup 后立即回收可能已安装的 listener */
    const registerListener = (registration: ListenerRegistration, register: () => void): boolean => {
      registration.state = 'registering';
      registration.cleanupRequested = false;
      try {
        register();
      } catch (cause) {
        registration.state = 'registered';
        throw cause;
      }
      registration.state = 'registered';
      if (canPublishListener(registration)) return true;
      visibleTeardown = teardown;
      try {
        teardown();
        if (visibleTeardown === teardown) visibleTeardown = undefined;
      } catch (cause) {
        disposed = false;
        throw cause;
      }
      return false;
    };
    const schedule = (): void => {
      if (!canSchedule() || scheduled !== undefined || scheduleInProgress) return;
      scheduleInProgress = true;
      try {
        const registration = { consumed: false, frame: undefined as number | undefined };
        const frame = window.requestAnimationFrame(() => {
          registration.consumed = true;
          if (scheduled === registration.frame) scheduled = undefined;
          activate();
        });
        registration.frame = frame;
        if (registration.consumed) return;
        scheduled = frame;
        if (canSchedule()) return;
        try {
          window.cancelAnimationFrame(frame);
          if (scheduled === frame) scheduled = undefined;
        } catch (cause) {
          visibleTeardown = teardown;
          disposed = false;
          throw cause;
        }
      } finally {
        scheduleInProgress = false;
      }
    };
    visibleTeardown = teardown;
    try {
      if (!registerListener(scrollRegistration, () => window.addEventListener('scroll', schedule, true))) return;
      if (!registerListener(resizeRegistration, () => window.addEventListener('resize', schedule))) return;
      schedule();
    } catch (cause) {
      try {
        teardown();
        if (visibleTeardown === teardown) visibleTeardown = undefined;
      } catch (cleanupCause) {
        throw new RetikzCanvasVisibilitySetupError(cause, cleanupCause);
      }
      throw cause;
    }
  };
  /** 计算当前 Scene root 与各 occurrence timeline 的全局 envelope 终点 */
  const animationEnvelopeEnd = (): number | null => {
    const sceneDuration = sceneAnimationDurationMs(scene);
    const rootDuration = sceneAnimationDurationMs({ ...scene, primitives: [] });
    const occurrenceEnds = [...timelineEndByToken.values()];
    if (sceneDuration === null || rootDuration === null || occurrenceEnds.includes(null)) return null;
    const finiteOccurrenceEnds = occurrenceEnds.filter((value): value is number => value !== null);
    return Math.max(sceneDuration, rootTimelineStart + rootDuration, ...finiteOccurrenceEnds);
  };
  /** 外部 cleanup 返回后重新读取 replacement gate，避免闭包状态被同步重入改写 */
  const canContinueClockReplacement = (): boolean => !cleanupStarted && clockReplacementInProgress;
  const replaceClock = (time: number, shouldPlay: boolean): void => {
    if (cleanupStarted || clockReplacementInProgress) return;
    clockReplacementInProgress = true;
    try {
      visibleTeardown?.();
      visibleTeardown = undefined;
      if (!canContinueClockReplacement()) return;
      clock.dispose();
      if (!canContinueClockReplacement()) return;
      clockEnd = animationEnvelopeEnd();
      clock = createClock({ durationMs: clockEnd, onFrame: renderFrame });
      clock.seek(time);
      if (!canContinueClockReplacement()) return;
      bindVisibility();
      if (shouldPlay && canContinueClockReplacement()) clock.play();
    } finally {
      clockReplacementInProgress = false;
    }
  };
  /** per-id play/restart/seek 后按有效时刻刷新 finite envelope，并确保新 clock 推进 */
  const ensureActiveTimelinesPlaying = (): void => {
    if (!enabled || cleanupStarted) return;
    const currentTime = clock.time;
    const walk = (primitives: ReadonlyArray<Scene['primitives'][number]>): void => {
      for (const primitive of primitives) {
        if (primitive.id !== undefined && registry.isActive(primitive.id)) {
          const duration = primitiveAnimationDurationMs(primitive);
          const effectiveTime = registry.timeFor(primitive.id, currentTime);
          timelineEndByToken.set(
            primitive.id,
            duration === null ? null : currentTime + Math.max(0, duration - effectiveTime),
          );
        }
        if (primitive.type === 'group') walk(primitive.children);
      }
    };
    walk(scene.primitives);
    const requiredEnd = animationEnvelopeEnd();
    const requiresReplacement = requiredEnd === null ? clockEnd !== null : clockEnd !== null && requiredEnd > clockEnd;
    if (requiresReplacement) replaceClock(currentTime, true);
    else clock.play();
  };
  for (const node of snapshot.topology) {
    const token = occurrenceIndex.tokenByIdentity.get(node.identity);
    const primitive = primitiveAtPath(snapshot, node.primitivePath);
    if (token !== undefined && primitive !== undefined)
      timelineEndByToken.set(token, primitiveAnimationDurationMs(primitive));
  }
  clockEnd = sceneAnimationDurationMs(scene);
  clock = createClock({ durationMs: clockEnd, onFrame: renderFrame });
  const dispose = (): void => {
    if (disposed || cleanupInProgress) return;
    cleanupStarted = true;
    cleanupInProgress = true;
    enabled = false;
    try {
      runBestEffortCleanup([
        () => {
          const teardown = visibleTeardown;
          if (teardown === undefined) return;
          teardown();
          if (visibleTeardown === teardown) visibleTeardown = undefined;
        },
        () => {
          if (clockDisposed) return;
          clock.dispose();
          clockDisposed = true;
        },
      ]);
      disposed = true;
    } finally {
      cleanupInProgress = false;
    }
  };
  const controls: AnimationControls = Object.freeze({
    play: () => {
      if (!enabled || cleanupStarted) return;
      clock.play();
      if (isAnimationStateActive()) coarsePlayRequested = true;
    },
    pause: () => {
      if (!enabled || cleanupStarted) return;
      clock.pause();
      if (isAnimationStateActive()) coarsePlayRequested = false;
    },
    seek: (timeMs: number) => {
      if (enabled && !cleanupStarted) clock.seek(timeMs);
    },
    dispose,
    get time() {
      return clock.time;
    },
    get running() {
      return enabled && !cleanupStarted && clock.running;
    },
  });
  /** 以 renderer-private token 与默认 public id 创建一组 per-id hydration controls */
  const makeHydrationControls = (defaultId: string): HydrationAnimationControls =>
    createCanvasIdAnimationControls({
      registry,
      clockTime: () => clock.time,
      ensurePlaying: ensureActiveTimelinesPlaying,
      renderFrame: () => renderFrame(),
      defaultId,
      resolveIds: publicId => occurrenceIndex.tokensByPublicId.get(publicId),
    });
  const state: CanvasAnimationState = Object.freeze({
    controls,
    makeHydrationControls: target => {
      if (!enabled || cleanupStarted) return createClockAnimationControls(undefined);
      const defaultToken = occurrenceIndex.tokenByIdentity.get(target.identity);
      if (defaultToken === undefined) return createClockAnimationControls(undefined);
      return makeHydrationControls(target.publicId ?? defaultToken);
    },
    makeHydrationControlsForPublicId: publicId => {
      if (!enabled || cleanupStarted) return createClockAnimationControls(undefined);
      const defaultToken = occurrenceIndex.tokensByPublicId.get(publicId)?.[0];
      return defaultToken === undefined ? createClockAnimationControls(undefined) : makeHydrationControls(publicId);
    },
    stage: (nextSnapshot, nextLayers, nextConfig, diff) => {
      const nextOccurrenceIndex = createCanvasAnimationOccurrenceIndex(nextSnapshot, occurrenceIndex, allocateToken);
      const candidateRegistry = createIdClockRegistry();
      candidateRegistry.restore(registry.capture());
      const candidateTimelineEndByToken = new Map(timelineEndByToken);
      const candidateTime = clock.time;
      const candidateRootTimelineStart = diff.rootChanged ? candidateTime : rootTimelineStart;
      let restartedAutoplay = diff.rootChanged && runtimeAnimationsHaveAutoplay(nextSnapshot.scene.animations);
      for (const change of diff.occurrences) {
        const currentToken = occurrenceIndex.tokenByIdentity.get(change.identity);
        const nextToken = nextOccurrenceIndex.tokenByIdentity.get(change.identity);
        if (change.kind === SceneAnimationOccurrenceChangeKind.Removed) {
          if (currentToken !== undefined) {
            candidateRegistry.remove(currentToken);
            candidateTimelineEndByToken.delete(currentToken);
          }
          continue;
        }
        if (
          (change.kind === SceneAnimationOccurrenceChangeKind.Added ||
            change.kind === SceneAnimationOccurrenceChangeKind.Changed) &&
          nextToken !== undefined
        ) {
          candidateRegistry.restartTimeline(nextToken, candidateTime);
          const node = nextSnapshot.topology.find(item => runtimeIdentityEquals(item.identity, change.identity));
          const primitive = node === undefined ? undefined : primitiveAtPath(nextSnapshot, node.primitivePath);
          if (primitive === undefined)
            throw new RetikzRenderError(
              RetikzRenderErrorCode.Runtime,
              'Canvas animation occurrence topology is incomplete',
            );
          const duration = primitiveAnimationDurationMs(primitive);
          candidateTimelineEndByToken.set(nextToken, duration === null ? null : candidateTime + duration);
          restartedAutoplay ||= runtimeAnimationsHaveAutoplay(primitive.animations);
        }
      }
      const candidateFrame: CanvasAnimationFrame = Object.freeze({
        scene: nextOccurrenceIndex.scene,
        resolveRootAnimationTime: time => Math.max(0, time - candidateRootTimelineStart),
        resolvePrimAnimation: (id, time) => resolveWithRegistry(candidateRegistry, id, time),
      });
      return Object.freeze({
        ...candidateFrame,
        commit: () => {
          const previousOccurrenceIndex = occurrenceIndex;
          const previousScene = scene;
          const previousLayers = currentLayers;
          const previousConfig = animationConfig;
          const previousRegistry = registry;
          const previousTimelineEndByToken = timelineEndByToken;
          const previousRootTimelineStart = rootTimelineStart;
          const previousTime = clock.time;
          const previousRunning = clock.running;
          const previousAutoplay = sceneHasAutoplayTrigger(scene);
          occurrenceIndex = nextOccurrenceIndex;
          scene = nextOccurrenceIndex.scene;
          currentLayers = nextLayers;
          animationConfig = nextConfig;
          registry = candidateRegistry;
          timelineEndByToken = candidateTimelineEndByToken;
          rootTimelineStart = candidateRootTimelineStart;
          const nextAutoplay = sceneHasAutoplayTrigger(scene);
          const shouldPlay =
            coarsePlayRequested ||
            registry.hasActive() ||
            restartedAutoplay ||
            (nextAutoplay && (previousAutoplay ? previousRunning : true));
          try {
            replaceClock(previousTime, shouldPlay);
          } catch (cause) {
            occurrenceIndex = previousOccurrenceIndex;
            scene = previousScene;
            currentLayers = previousLayers;
            animationConfig = previousConfig;
            registry = previousRegistry;
            timelineEndByToken = previousTimelineEndByToken;
            rootTimelineStart = previousRootTimelineStart;
            const retryRollback = (): void => replaceClock(previousTime, previousRunning);
            try {
              retryRollback();
            } catch (rollbackCause) {
              throw new RetikzCanvasAnimationCommitRecoveryError(cause, rollbackCause, retryRollback);
            }
            throw cause;
          }
          return () => {
            occurrenceIndex = previousOccurrenceIndex;
            scene = previousScene;
            currentLayers = previousLayers;
            animationConfig = previousConfig;
            registry = previousRegistry;
            timelineEndByToken = previousTimelineEndByToken;
            rootTimelineStart = previousRootTimelineStart;
            replaceClock(previousTime, previousRunning);
          };
        },
      });
    },
    renderFrame: () => renderFrame(),
    suspend: () => {
      if (!enabled || cleanupStarted) return false;
      const running = clock.running;
      enabled = false;
      runBestEffortCleanup([
        () => {
          const teardown = visibleTeardown;
          if (teardown === undefined) return;
          teardown();
          if (visibleTeardown === teardown) visibleTeardown = undefined;
        },
        () => clock.pause(),
      ]);
      return running;
    },
    resume: running => {
      if (enabled || cleanupStarted) return;
      enabled = true;
      runBestEffortCleanup([bindVisibility, () => (running && enabled && !cleanupStarted ? clock.play() : undefined)]);
    },
    dispose,
  });
  try {
    bindVisibility();
    if (sceneHasAutoplayTrigger(scene)) clock.play();
  } catch (cause) {
    const setupCause = cause instanceof RetikzCanvasVisibilitySetupError ? cause.cause : cause;
    try {
      state.dispose();
    } catch (cleanupCause) {
      throw new RetikzCanvasAnimationSetupError(setupCause, cleanupCause, state);
    }
    throw setupCause;
  }
  return state;
};

/** 创建内置 Canvas retained renderer */
export const createBuiltinCanvasRetainedRenderer = (
  host: HTMLCanvasElement,
  options: RetainedCanvasRendererImmutableOptions,
): RetainedCanvasRenderer => {
  const immutableOptions = Object.freeze({
    ...options,
    devicePixelRatio: resolvedDevicePixelRatio(options),
  });
  let currentSnapshot: SceneRuntimeSnapshot | undefined;
  let currentLayers: ReadonlyArray<RenderReadonlyLayer> = Object.freeze([]);
  let currentBitmap: HTMLCanvasElement | undefined;
  let currentAnimation: CanvasAnimationState | undefined;
  let currentHydration: HydrationController | undefined;
  let currentPaintConfig: RenderRuntimeConfig['animation'];
  let currentDisplayList: ReadonlyArray<CanvasDisplayItem> | undefined;
  let currentConfig: RenderRuntimeConfig | undefined;
  let currentHostStyle: CanvasHostStyle | undefined;
  const candidateHydrationCleanup = createHydrationCleanupQueue();
  const candidateAnimationCleanup = createCanvasAnimationCleanupQueue();
  const imageLoader = createCanvasImageLoader(() => {
    if (currentSnapshot === undefined || currentConfig === undefined) return;
    const time =
      currentAnimation?.controls.time ??
      currentConfig.animation?.snapshotAt ??
      (currentConfig.animation?.enabled === false ? undefined : 0);
    const bitmap = createBitmap(
      host,
      resolveCanvasBitmapSize(currentSnapshot, currentConfig, immutableOptions),
      currentSnapshot,
      currentLayers,
      currentConfig,
      immutableOptions,
      readCanvasHostStyle(host),
      time,
      undefined,
      imageLoader.getImage,
    );
    currentBitmap = bitmap;
    host.width = bitmap.width;
    host.height = bitmap.height;
    paintBitmap(host, bitmap);
    currentAnimation?.renderFrame();
  });

  const prepare = (
    patch: ScenePatch | undefined,
    frame: RenderFrameSnapshot,
    config: RenderRuntimeConfig,
  ): RuntimePreparedCommit => {
    const snapshot = frame.primary;
    const layers = validateReadonlyLayers(frame.layers);
    const imageStage = imageLoader.stage(collectCanvasImageHrefs(snapshot, layers));
    try {
      const animationDiff = diffSceneAnimationDescriptors(currentSnapshot, snapshot);
      const replaceScene = patch?.operations.some(operation => operation.kind === 'replaceScene') === true;
      const reuseAnimation =
        currentAnimation !== undefined &&
        config.animation?.enabled !== false &&
        config.animation?.snapshotAt === undefined &&
        sceneHasAnimations(asScene(snapshot)) &&
        !replaceScene &&
        runtimeStructuralEquals(currentPaintConfig, config.animation);
      const candidateTime = reuseAnimation
        ? currentAnimation?.controls.time
        : (config.animation?.snapshotAt ?? (config.animation?.enabled === false ? undefined : 0));
      const animationCandidate = reuseAnimation
        ? currentAnimation?.stage(snapshot, layers, config, animationDiff)
        : undefined;
      const targetSize = resolveCanvasBitmapSize(snapshot, config, immutableOptions);
      const bitmapSizeStable =
        currentBitmap?.width === targetSize.width &&
        currentBitmap.height === targetSize.height &&
        host.width === targetSize.width &&
        host.height === targetSize.height;
      const hostStyle = readCanvasHostStyle(host);
      const reuseBitmap =
        patch?.operations.length === 0 &&
        currentBitmap !== undefined &&
        bitmapSizeStable &&
        currentSnapshot?.scene === snapshot.scene &&
        runtimeStructuralEquals(currentLayers, layers) &&
        runtimeStructuralEquals(currentPaintConfig, config.animation) &&
        runtimeStructuralEquals(currentHostStyle, hostStyle);
      const displayUpdate =
        reuseBitmap || !bitmapSizeStable || currentLayers.length > 0 || layers.length > 0
          ? undefined
          : prepareDisplayListUpdate(currentDisplayList, patch);
      // display list 会拒绝任意层级的 animation，dirty rollback 因而可安全读取 committed bitmap
      const incrementalBitmap =
        displayUpdate !== undefined && currentBitmap !== undefined
          ? createIncrementalBitmap(
              host,
              currentBitmap,
              snapshot,
              config,
              immutableOptions,
              hostStyle,
              candidateTime,
              animationCandidate,
              imageStage.getImage,
              displayUpdate,
            )
          : undefined;
      const bitmap = reuseBitmap
        ? currentBitmap
        : incrementalBitmap?.kind === 'dirty'
          ? incrementalBitmap.bitmap
          : incrementalBitmap?.kind === 'offscreen'
            ? currentBitmap
            : createBitmap(
                host,
                targetSize,
                snapshot,
                layers,
                config,
                immutableOptions,
                hostStyle,
                candidateTime,
                animationCandidate,
                imageStage.getImage,
              );
      const candidateDisplayList = reuseBitmap
        ? currentDisplayList
        : (displayUpdate?.items ?? buildDisplayList(snapshot));
      const rollbackBitmap =
        reuseBitmap || currentSnapshot === undefined || incrementalBitmap !== undefined
          ? undefined
          : captureBitmap(host);
      const previousSnapshot = currentSnapshot;
      const previousLayers = currentLayers;
      const previousBitmap = currentBitmap;
      const previousAnimation = currentAnimation;
      const previousHydration = currentHydration;
      const previousPaintConfig = currentPaintConfig;
      const previousDisplayList = currentDisplayList;
      const previousConfig = currentConfig;
      const previousHostStyle = currentHostStyle;
      const previousHostSize = Object.freeze({ width: host.width, height: host.height });
      let animation: CanvasAnimationState | undefined;
      const disposeCandidateAnimation = (): void => {
        if (reuseAnimation) return;
        const candidate = animation;
        if (candidate === undefined) return;
        candidateAnimationCleanup.dispose(candidate);
        if (animation === candidate) animation = undefined;
      };
      let rollbackAnimationRebind: (() => void) | undefined;
      let retryAnimationCommitRollback: (() => void) | undefined;
      let previousAnimationRunning: boolean | undefined;
      let hydration: HydrationController | undefined;
      const disposeCandidateHydration = (): void => {
        const candidate = hydration;
        if (candidate === undefined) return;
        candidateHydrationCleanup.dispose(candidate);
        hydration = undefined;
      };
      let committed = false;
      let rolledBack = false;
      let hostMutated = false;
      let committedBitmapMutated = false;
      let previousHydrationDisposeAttempted = false;
      return Object.freeze({
        commit: () => {
          if (!reuseBitmap) {
            if (incrementalBitmap?.kind === 'dirty' && previousBitmap !== undefined) {
              committedBitmapMutated = true;
              paintBitmapRegion(previousBitmap, incrementalBitmap.bitmap, incrementalBitmap.region, 'full');
              hostMutated = true;
              paintBitmapRegion(host, incrementalBitmap.bitmap, incrementalBitmap.region, 'full');
            } else if (incrementalBitmap === undefined) {
              hostMutated = true;
              host.width = targetSize.width;
              host.height = targetSize.height;
              paintBitmap(host, bitmap);
            }
          }
          if (reuseAnimation) animation = previousAnimation;
          else {
            try {
              animation = createCanvasAnimation(host, snapshot, layers, config, immutableOptions, imageLoader.getImage);
            } catch (cause) {
              const setupFailure = recoverCanvasAnimationSetupFailure(cause);
              if (setupFailure !== undefined) {
                animation = setupFailure.state;
                candidateAnimationCleanup.retain(setupFailure.state);
                throw setupFailure.cause;
              }
              throw cause;
            }
          }
          if (reuseAnimation && animation !== undefined) {
            try {
              rollbackAnimationRebind = animationCandidate?.commit();
            } catch (cause) {
              if (cause instanceof RetikzCanvasAnimationCommitRecoveryError) {
                retryAnimationCommitRollback = cause.retryRollback;
                throw cause.cause;
              }
              throw cause;
            }
          }
          if (!reuseAnimation && previousAnimation !== undefined) {
            previousAnimationRunning = previousAnimation.controls.running;
            previousAnimationRunning = previousAnimation.suspend();
          }
          if (previousHydration !== undefined) {
            previousHydrationDisposeAttempted = true;
            previousHydration.dispose();
          }
          try {
            hydration = createCanvasHydration(host, snapshot, config, animation);
          } catch (cause) {
            const setupFailure = recoverHydrationSetupFailure(cause);
            if (setupFailure !== undefined) {
              hydration = setupFailure.controller;
              throw setupFailure.cause;
            }
            throw cause;
          }
          currentSnapshot = snapshot;
          currentLayers = layers;
          currentBitmap = incrementalBitmap === undefined ? bitmap : previousBitmap;
          currentHydration = hydration;
          currentAnimation = animation;
          currentPaintConfig = config.animation;
          currentDisplayList = candidateDisplayList;
          currentConfig = config;
          currentHostStyle = hostStyle;
          imageStage.commit();
          committed = true;
        },
        rollback: () => {
          rolledBack = true;
          runBestEffortCleanup([
            () => {
              const retry = retryAnimationCommitRollback;
              if (retry !== undefined) {
                retry();
                if (retryAnimationCommitRollback === retry) retryAnimationCommitRollback = undefined;
              }
              rollbackAnimationRebind?.();
            },
            disposeCandidateHydration,
            ...(!reuseAnimation ? [disposeCandidateAnimation] : []),
            () => {
              if (previousAnimationRunning !== undefined) previousAnimation?.resume(previousAnimationRunning);
            },
            () => {
              if (incrementalBitmap?.kind === 'dirty') {
                if (committedBitmapMutated && previousBitmap !== undefined) {
                  paintBitmapRegion(previousBitmap, incrementalBitmap.rollback, incrementalBitmap.region, 'region');
                }
                if (hostMutated) {
                  paintBitmapRegion(host, incrementalBitmap.rollback, incrementalBitmap.region, 'region');
                }
              } else if (incrementalBitmap === undefined && hostMutated) {
                host.width = previousHostSize.width;
                host.height = previousHostSize.height;
                paintBitmap(host, rollbackBitmap ?? previousBitmap);
              }
            },
            () => {
              currentSnapshot = previousSnapshot;
              currentLayers = previousLayers;
              currentBitmap = previousBitmap;
              currentHydration = previousHydration;
              currentAnimation = previousAnimation;
              currentPaintConfig = previousPaintConfig;
              currentDisplayList = previousDisplayList;
              currentConfig = previousConfig;
              currentHostStyle = previousHostStyle;
            },
            () => {
              if (
                !previousHydrationDisposeAttempted ||
                previousHydration === undefined ||
                previousSnapshot === undefined ||
                previousConfig === undefined
              ) {
                return;
              }
              previousHydration.dispose();
              try {
                currentHydration = createCanvasHydration(host, previousSnapshot, previousConfig, previousAnimation);
              } catch (cause) {
                const setupFailure = recoverHydrationSetupFailure(cause);
                if (setupFailure !== undefined) {
                  currentHydration = setupFailure.controller;
                  throw setupFailure.cause;
                }
                throw cause;
              }
            },
            () => imageStage.rollback(),
          ]);
        },
        dispose: () => {
          runBestEffortCleanup([
            ...(rolledBack
              ? [
                  () => {
                    const retry = retryAnimationCommitRollback;
                    if (retry === undefined) return;
                    retry();
                    if (retryAnimationCommitRollback === retry) retryAnimationCommitRollback = undefined;
                  },
                  () => {
                    disposeCandidateHydration();
                  },
                  ...(!reuseAnimation ? [disposeCandidateAnimation] : []),
                ]
              : []),
            ...(committed && !rolledBack && !reuseAnimation && previousAnimation !== undefined
              ? [() => candidateAnimationCleanup.dispose(previousAnimation)]
              : []),
            () => imageStage.dispose(),
          ]);
        },
      });
    } catch (cause) {
      imageStage.rollback();
      throw cause;
    }
  };

  return defineRetainedRenderer({
    backend: 'canvas',
    host,
    capability: 'entity',
    readonlyLayerCapability: 'supported',
    prepareMount: (frame, config) => prepare(undefined, frame, config),
    prepare: (patch, frame, config) => prepare(patch, frame, config),
    read: () => {
      if (currentSnapshot === undefined)
        throw new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'Canvas retained renderer is not committed');
      return Object.freeze({
        frame: Object.freeze({ primary: currentSnapshot, layers: currentLayers }),
        ...(currentAnimation === undefined ? {} : { animation: currentAnimation.controls }),
      });
    },
    dispose: () => {
      const hydration = currentHydration;
      const animation = currentAnimation;
      runBestEffortCleanup([
        () => {
          hydration?.dispose();
          if (currentHydration === hydration) currentHydration = undefined;
        },
        () => candidateHydrationCleanup.disposePending(),
        () => {
          if (animation !== undefined) candidateAnimationCleanup.dispose(animation);
          if (currentAnimation === animation) currentAnimation = undefined;
        },
        () => candidateAnimationCleanup.disposePending(),
        () => imageLoader.dispose(),
        () => {
          currentBitmap = undefined;
          currentSnapshot = undefined;
          currentLayers = Object.freeze([]);
          currentPaintConfig = undefined;
          currentDisplayList = undefined;
          currentConfig = undefined;
        },
      ]);
    },
  });
};
