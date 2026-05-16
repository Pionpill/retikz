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

/** 双指几何与距离仅用到 clientX / clientY，DOM Touch 与 React Touch 都满足 */
type TouchPoint = { clientX: number; clientY: number };

const touchCenter = (a: TouchPoint, b: TouchPoint): { x: number; y: number } => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});

const touchDistance = (a: TouchPoint, b: TouchPoint): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

/**
 * 渲染区平移 + 缩放统一 hook
 * @description 拖拽期间监听 window 而非容器，指针离开 demo 边界仍能继续 drag；
 *   双指自实现 pinch（用 touch-action: none 抢回手势所有权，否则与浏览器原生 pinch 互相冲掉），
 *   按 startDist→当前距离 比例缩放，并按双指中心位移平移；
 *   `beginDrag(enabled)` 工厂：卡内传 dragEnabled，Dialog 内传 true 强制启用
 */
export const usePanZoom = () => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startCenterX: number;
    startCenterY: number;
    baseScale: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const apply = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setTransform(t => ({ ...t, x: dragRef.current!.baseX + dx, y: dragRef.current!.baseY + dy }));
    };
    const onMouseMove = (e: MouseEvent) => apply(e.clientX, e.clientY);
    // touchmove 注册为 passive: false：拖拽期间 preventDefault 抑制页面滚动，否则浏览器优先把触摸交给页面 pan，demo 位移跟不上手指
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

  useEffect(() => {
    if (!isPinching) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || !pinchRef.current) return;
      e.preventDefault();
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const center = touchCenter(e.touches[0], e.touches[1]);
      const { startDist, startCenterX, startCenterY, baseScale, baseX, baseY } = pinchRef.current;
      const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, baseScale * (dist / startDist)));
      const x = baseX + (center.x - startCenterX);
      const y = baseY + (center.y - startCenterY);
      setTransform({ x, y, scale });
    };
    const onTouchEnd = (e: TouchEvent) => {
      // 任一手指离开就退出 pinch（不平滑过渡回单指 drag，避免抬一根再缩放跳变）
      if (e.touches.length < 2) {
        pinchRef.current = null;
        setIsPinching(false);
      }
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isPinching]);

  const panBy = (dx: number, dy: number) => setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  const zoomBy = (factor: number) =>
    setTransform(t => ({ ...t, scale: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.scale * factor)) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  /**
   * mousedown / touchstart 共用入口
   * @description 鼠标只接左键；触摸单指走 drag、双指走自实现 pinch（touch-action: none 已抢回手势所有权）；
   *   抑制页面滚动靠 useEffect 里的 window touchmove preventDefault
   */
  const beginDrag =
    (enabled: boolean) =>
    (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>): void => {
      if (!enabled) return;
      if ('touches' in e) {
        if (e.touches.length >= 2) {
          // 双指：进入 pinch 模式，若 1 指已在 drag 中先收掉避免两个 effect 同时 setTransform
          const [a, b] = [e.touches[0], e.touches[1]];
          const dist = touchDistance(a, b);
          const center = touchCenter(a, b);
          pinchRef.current = {
            startDist: dist,
            startCenterX: center.x,
            startCenterY: center.y,
            baseScale: transform.scale,
            baseX: transform.x,
            baseY: transform.y,
          };
          dragRef.current = null;
          setIsDragging(false);
          setIsPinching(true);
          return;
        }
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        dragRef.current = { startX: t.clientX, startY: t.clientY, baseX: transform.x, baseY: transform.y };
        setIsDragging(true);
      } else {
        if (e.button !== 0) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: transform.x, baseY: transform.y };
        setIsDragging(true);
      }
    };

  const isTransformed = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;
  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag };
};
