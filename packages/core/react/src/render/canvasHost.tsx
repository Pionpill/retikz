import { type CSSProperties, type FC, useEffect, useReducer, useRef } from 'react';
import type { Scene } from '@retikz/core';
import { hitTest, renderToCanvas } from '@retikz/render/canvas';
import type { AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/canvas';
import type { BuildContext, HydrationHandlers } from '@retikz/render/hydration';
import {
  createClockAnimationControls,
  createHydrationController,
  geometryOf,
  metaOf,
} from '@retikz/render/hydration';
import type { AnimationControls } from '@retikz/render/animation';
import { createClock, prefersReducedMotion, sceneAnimationDurationMs, sceneHasAnimations, sceneHasAutoplayTrigger } from '@retikz/render/animation';

/** 按 href 缓存的图片加载态（image paint server 用；跨 CanvasHost 实例共享去重） */
type ImageEntry = { img: HTMLImageElement; loaded: boolean; failed: boolean; waiters: Set<() => void> };
const imageCache = new Map<string, ImageEntry>();

/**
 * 取已解码图片；未就绪则发起加载、注册重绘回调并返回 null
 * @description canvas 同步绘制无法 await，故首帧返回 null，加载完调用 `onReady` 触发宿主重绘后命中缓存绘出。
 *   失败（onerror）标记 failed、恒返回 null，不无限重试。
 */
const loadImage = (href: string, onReady: () => void): HTMLImageElement | null => {
  const cached = imageCache.get(href);
  if (cached) {
    if (cached.loaded) return cached.img;
    if (cached.failed) return null;
    cached.waiters.add(onReady);
    return null;
  }
  const img = new Image();
  const entry: ImageEntry = { img, loaded: false, failed: false, waiters: new Set([onReady]) };
  imageCache.set(href, entry);
  img.onload = () => {
    entry.loaded = true;
    for (const w of entry.waiters) w();
    entry.waiters.clear();
  };
  img.onerror = () => {
    entry.failed = true;
    entry.waiters.clear();
  };
  img.src = href;
  return entry.loaded ? img : null;
};

/** CanvasHost 组件 props */
export type CanvasHostProps = {
  /** 已编译 Scene */
  scene: Scene;
  /**
   * 水合 handler 注册表（按图元 id）
   * @description 经 `createHydrationController(canvas, handlers, locate)` 绑到 `<canvas>`，
   *   locate 由 `hitTest` + client→Scene 坐标映射（逆 meet-fit）构成，与 svg 模式共用同一注册表语义。
   */
  handlers?: HydrationHandlers;
  /** 透传显示宽度 */
  width?: number | string;
  /** 透传显示高度 */
  height?: number | string;
  /** 透传 className */
  className?: string;
  /** 透传样式 */
  style?: CSSProperties;
  /** 是否播放动画（缺省 true）；false 或 prefers-reduced-motion → 只画 base 静态、不起 rAF */
  animate?: boolean;
  /** 自定义 easing 注册表（透传 drawScene） */
  easings?: EasingRegistry;
  /** 自定义 property 插值器注册表（透传 drawScene） */
  animationProperties?: AnimationPropertyRegistry;
};

const devicePixelRatio = (): number => {
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

const displayStyle = (
  width: number | string | undefined,
  height: number | string | undefined,
  style: CSSProperties | undefined,
): CSSProperties | undefined => {
  if (width === undefined && height === undefined) return style;
  return { width, height, ...style };
};

const canvasFontFamily = (canvas: HTMLCanvasElement): string | undefined => {
  if (typeof getComputedStyle === 'undefined') return undefined;
  const fontFamily = getComputedStyle(canvas).fontFamily.trim();
  return fontFamily.length > 0 ? fontFamily : undefined;
};

/**
 * 把指针的 client 像素坐标逆 meet-fit 映射成 Scene user units
 * @description 与 `renderToCanvas` 的 `computeCanvasTransform` / vanilla `mountCanvas.clientToScene` 同口径：
 *   读 `canvas.getBoundingClientRect()` 把 client 坐标降到 canvas 局部 CSS 像素（dpr 在 client→CSS 这步已无关），
 *   再去 letterbox offset、除 scale、加 layout origin。落在 letterbox 黑边外的点会得到 layout 区域外坐标，
 *   交由 `hitTest` 自然判为无命中。
 */
const clientToScene = (
  canvas: HTMLCanvasElement,
  scene: Scene,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const { layout } = scene;
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
  const offsetX = (rect.width - layout.width * scale) / 2;
  const offsetY = (rect.height - layout.height * scale) / 2;
  const contentX = clientX - rect.left - offsetX;
  const contentY = clientY - rect.top - offsetY;
  return { x: contentX / scale + layout.x, y: contentY / scale + layout.y };
};

/** React canvas 宿主：管理 `<canvas>` 与全量重绘 effect */
export const CanvasHost: FC<CanvasHostProps> = props => {
  const { scene, handlers, width, height, className, style, animate: animateProp, easings, animationProperties } = props;
  const animate = animateProp !== false;
  const ref = useRef<HTMLCanvasElement>(null);
  // rAF 时钟句柄：render effect 写、hydration effect 的 ctx.animation（coarse）读 live，update 后自动跟随
  const clockRef = useRef<AnimationControls | null>(null);
  // image 加载完 / 主题切换都触发重绘（renderToCanvas 重读 getComputedStyle 的 color → currentColor）
  const [renderTick, bumpRender] = useReducer((n: number) => n + 1, 0);

  // 主题切换（<html> 的 class / data-theme / style 变化）→ 重绘，让 currentColor 跟随（canvas 命令式、不像 SVG 声明式自动响应）
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return undefined;
    const observer = new MutationObserver(() => bumpRender());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = devicePixelRatio();
    // 位图按「名义显示尺寸」width/height 开（两者均为有限数值时），renderToCanvas 再把 Scene 内容 meet-fit 进去——
    // 完全镜像 SVG：`<svg width height viewBox=scene.layout preserveAspectRatio=meet>`。二者 intrinsic 宽高比一致，
    // 故 CSS `height:auto` / `maxWidth` 等响应式写法下 canvas 与 svg 显示尺寸严格一致（否则位图取内容比时，
    // height:auto 会让 canvas 跟随内容比、与 svg 的名义比不符而偏大/偏小）。还顺带消除名义盒 >> 内容时的上采样模糊。
    // 未给数值尺寸时回退内容边界——此时 svg 也无 width/height attr、intrinsic 取 viewBox 比，仍然对齐。
    const hasNominalSize =
      typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height);
    const bitmapWidth = hasNominalSize ? width : scene.layout.width;
    const bitmapHeight = hasNominalSize ? height : scene.layout.height;
    canvas.width = Math.max(1, Math.round(bitmapWidth * ratio));
    canvas.height = Math.max(1, Math.round(bitmapHeight * ratio));
    const baseOptions = {
      devicePixelRatio: ratio,
      defaultFontFamily: canvasFontFamily(canvas),
      getImage: (href: string) => loadImage(href, bumpRender),
      easings,
      animationProperties,
    };
    // base 静态先画一帧；含动画且未降级 → 起 rAF 共享时钟逐帧重绘（auto track 自动播；manual/onEvent/visible 渲染 base）
    renderToCanvas(canvas, scene, baseOptions);
    if (!animate || prefersReducedMotion() || !sceneHasAnimations(scene)) {
      clockRef.current = null;
      return undefined;
    }
    const clock = createClock({
      durationMs: sceneAnimationDurationMs(scene),
      onFrame: time => renderToCanvas(canvas, scene, { ...baseOptions, time }),
    });
    clockRef.current = clock;
    if (sceneHasAutoplayTrigger(scene)) clock.play();
    return () => {
      clock.dispose();
      clockRef.current = null;
    };
  }, [animate, animationProperties, className, easings, height, renderTick, scene, style, width]);

  // 水合：把 handler 注册表经 createHydrationController + (hitTest + 逆 meet-fit 坐标映射) 绑到 <canvas>。
  // locate(event) = client 坐标 → clientToScene 逆 meet-fit 成 Scene 点 → hitTest 返回命中图元 id。
  // context2d 用 canvas 自身 2D context；renderToCanvas 后残留 meet-fit transform，须先 setTransform 归一为
  // identity 再点测（hitTest 在 Scene user units 自管 group transform 栈，否则路径被二次缩放偏移）。
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const context2d = canvas.getContext('2d') ?? undefined;
    const locate = (event: Event): string | null => {
      const mouse = event as MouseEvent;
      const point = clientToScene(canvas, scene, mouse.clientX, mouse.clientY);
      context2d?.setTransform(1, 0, 0, 1, 0, 0);
      return hitTest(scene, point, { context2d });
    };
    // canvas 富 ctx：无逐元素 DOM（element=null），point 逆 meet-fit，动画 coarse（scene 级单时钟，读 clockRef live）。
    const buildContext: BuildContext = (event, id) => {
      const mouse = event as MouseEvent;
      return {
        id,
        meta: metaOf(scene, id),
        renderer: 'canvas',
        element: null,
        root: canvas,
        point: typeof mouse.clientX === 'number' ? clientToScene(canvas, scene, mouse.clientX, mouse.clientY) : null,
        geometry: geometryOf(scene, id),
        animation: createClockAnimationControls(clockRef.current ?? undefined),
        scene,
      };
    };
    const controller = createHydrationController(canvas, handlers ?? {}, locate, buildContext);
    return () => controller.dispose();
  }, [handlers, scene]);

  // object-fit:contain：受限容器（如 max-width 收窄宽度但高度固定）下让位图按比例 letterbox 不拉伸，
  // 对齐 SVG preserveAspectRatio="meet"；用户可经 style.objectFit 覆盖
  return (
    <canvas ref={ref} className={className} style={{ objectFit: 'contain', ...displayStyle(width, height, style) }} />
  );
};
