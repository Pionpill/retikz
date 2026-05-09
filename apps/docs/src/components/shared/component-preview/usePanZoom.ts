import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';

import type { Transform } from './_shared';

/** 单次按钮点击平移步长（px） */
export const PAN_STEP = 24;
/** 缩放因子：放大 ×1.2 / 缩小 ÷1.2 */
export const ZOOM_FACTOR = 1.2;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;

/**
 * 渲染区平移 + 缩放统一 hook。
 * - 状态：transform（{x,y,scale}）+ isDragging
 * - 拖拽期间监听 window 而非容器：指针离开 demo 边界时仍能继续 drag，松开（在哪都行）即结束
 * - `beginDrag(enabled)` 工厂返回一个 mousedown handler：卡内传 dragEnabled，Dialog 内传 true 强制启用
 */
export const usePanZoom = () => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTransform(t => ({ ...t, x: dragRef.current!.baseX + dx, y: dragRef.current!.baseY + dy }));
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const panBy = (dx: number, dy: number) => setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  const zoomBy = (factor: number) =>
    setTransform(t => ({ ...t, scale: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.scale * factor)) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  const beginDrag =
    (enabled: boolean) =>
    (e: ReactMouseEvent<HTMLDivElement>): void => {
      if (!enabled || e.button !== 0) return;
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: transform.x, baseY: transform.y };
      setIsDragging(true);
    };

  const isTransformed = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;
  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag };
};
