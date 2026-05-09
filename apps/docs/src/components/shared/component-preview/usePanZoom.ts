import {
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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
    const apply = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setTransform(t => ({ ...t, x: dragRef.current!.baseX + dx, y: dragRef.current!.baseY + dy }));
    };
    const onMouseMove = (e: MouseEvent) => apply(e.clientX, e.clientY);
    // touchmove 注册为 passive: false：拖拽期间需要 preventDefault 抑制页面滚动，
    // 否则浏览器会优先把这次触摸交给页面 pan，demo 内的位移就跟不上手指。
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      apply(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [isDragging]);

  const panBy = (dx: number, dy: number) => setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  const zoomBy = (factor: number) =>
    setTransform(t => ({ ...t, scale: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.scale * factor)) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  /**
   * mousedown / touchstart 共用入口：
   * - 鼠标只接收左键
   * - 触摸只接收单指（多指给浏览器自己处理 pinch-zoom 等手势）
   * 真正抑制页面滚动靠 useEffect 里的 window touchmove preventDefault；touchstart 这里不需要。
   */
  const beginDrag =
    (enabled: boolean) =>
    (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>): void => {
      if (!enabled) return;
      let clientX: number;
      let clientY: number;
      if ('touches' in e) {
        if (e.touches.length !== 1) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        if (e.button !== 0) return;
        e.preventDefault();
        clientX = e.clientX;
        clientY = e.clientY;
      }
      dragRef.current = { startX: clientX, startY: clientY, baseX: transform.x, baseY: transform.y };
      setIsDragging(true);
    };

  const isTransformed = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;
  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag };
};
