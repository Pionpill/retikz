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

const numericLength = (
  value: number | string | undefined,
  fallback: number,
): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return fallback;
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
  // image paint server 加载完触发重绘（缓存命中后 renderToCanvas 即可绘出图片）
  const [imageTick, bumpImageTick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = devicePixelRatio();
    const cssWidth = numericLength(width, scene.layout.width);
    const cssHeight = numericLength(height, scene.layout.height);
    canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    canvas.height = Math.max(1, Math.round(cssHeight * ratio));
    renderToCanvas(canvas, scene, {
      devicePixelRatio: ratio,
      defaultFontFamily: canvasFontFamily(canvas),
      getImage: href => loadImage(href, bumpImageTick),
    });
  }, [className, height, imageTick, scene, style, width]);

  return <canvas ref={ref} className={className} style={displayStyle(width, height, style)} />;
};
