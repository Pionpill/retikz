import { type CSSProperties, type FC, useEffect, useRef } from 'react';
import type { Scene } from '@retikz/core';
import { renderToCanvas } from '@retikz/canvas';

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

const displayStyle = (
  width: number | string | undefined,
  height: number | string | undefined,
  style: CSSProperties | undefined,
): CSSProperties | undefined => {
  if (width === undefined && height === undefined) return style;
  return { width, height, ...style };
};

/** React canvas 宿主：管理 `<canvas>` 与全量重绘 effect */
export const CanvasHost: FC<CanvasHostProps> = props => {
  const { scene, width, height, className, style } = props;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const devicePixelRatio = globalThis.devicePixelRatio;
    const cssWidth = numericLength(width, scene.layout.width);
    const cssHeight = numericLength(height, scene.layout.height);
    canvas.width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
    renderToCanvas(canvas, scene, { devicePixelRatio });
  }, [height, scene, width]);

  return <canvas ref={ref} className={className} style={displayStyle(width, height, style)} />;
};
