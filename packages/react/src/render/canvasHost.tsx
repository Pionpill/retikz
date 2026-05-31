import { type CSSProperties, type FC, useEffect, useReducer, useRef } from 'react';
import type { Scene } from '@retikz/core';
import { renderToCanvas } from '@retikz/canvas';

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
  /** 透传显示宽度 */
  width?: number | string;
  /** 透传显示高度 */
  height?: number | string;
  /** 透传 className */
  className?: string;
  /** 透传样式 */
  style?: CSSProperties;
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

/** React canvas 宿主：管理 `<canvas>` 与全量重绘 effect */
export const CanvasHost: FC<CanvasHostProps> = props => {
  const { scene, width, height, className, style } = props;
  const ref = useRef<HTMLCanvasElement>(null);
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
    // 位图按 Scene 内容边界（scene.layout）开，对齐 SVG 的 viewBox=scene.layout：位图宽高比 = 内容比，
    // 这样 object-fit:contain 只做一次 fit（= SVG preserveAspectRatio meet），canvas 与 SVG 像素一致。
    // 名义 width/height 仅作 CSS 显示盒（displayStyle），不参与位图分辨率，否则名义比 ≠ 内容比会二次 letterbox 致偏小。
    canvas.width = Math.max(1, Math.round(scene.layout.width * ratio));
    canvas.height = Math.max(1, Math.round(scene.layout.height * ratio));
    renderToCanvas(canvas, scene, {
      devicePixelRatio: ratio,
      defaultFontFamily: canvasFontFamily(canvas),
      getImage: href => loadImage(href, bumpRender),
    });
  }, [className, height, renderTick, scene, style, width]);

  // object-fit:contain：受限容器（如 max-width 收窄宽度但高度固定）下让位图按比例 letterbox 不拉伸，
  // 对齐 SVG preserveAspectRatio="meet"；用户可经 style.objectFit 覆盖
  return (
    <canvas ref={ref} className={className} style={{ objectFit: 'contain', ...displayStyle(width, height, style) }} />
  );
};
