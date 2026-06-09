// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IR } from '@retikz/core';
import { type HydrationContext, mountCanvas } from '../src';

/**
 * @retikz/vanilla mountCanvas 的 canvas 水合（client 坐标 → 逆 meet-fit → hitTest 命中 → handler）
 * @description canvas 无逐图元 DOM，水合靠 client px 经 view.clientToScene 逆 meet-fit 成 Scene units，再 hitTest 命中 id。
 *   jsdom 无真实 canvas backend，故沿用 render 层 canvas-hittest 的做法——spy getContext 返回「几何忠实」的 2D
 *   context 充当原生 canvas 原语（记录子路径、射线法点测），mountCanvas / clientToScene / hitTest 的选择逻辑仍真实受测。
 *   canvas getBoundingClientRect 也 spy 出受限容器（letterbox）的显示盒，喂确定坐标。
 *   stub 阶段 clientToScene 直返 client 坐标、view.hydrate 空 dispose、不绑 listener → 命中 / 触发类断言此刻预期 fail；
 *   dispose 类断言预期 pass。
 */

type Pt = [number, number];
type SubPath = { points: Array<Pt>; closed: boolean };

/** 几何忠实的 2D context harness（compact 版，足够 hitTest 的路径构建 + 点测） */
const createGeometryContext = (): CanvasRenderingContext2D => {
  let subPaths: Array<SubPath> = [];
  let current: SubPath | null = null;
  let cursor: Pt = [0, 0];
  let matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const stack: Array<[number, number, number, number, number, number]> = [];
  let lineWidth = 1;

  const apply = (x: number, y: number): Pt => {
    const [a, b, c, d, e, f] = matrix;
    return [a * x + c * y + e, b * x + d * y + f];
  };
  const multiply = (m: [number, number, number, number, number, number]): void => {
    const [a, b, c, d, e, f] = matrix;
    const [a2, b2, c2, d2, e2, f2] = m;
    matrix = [
      a * a2 + c * b2,
      b * a2 + d * b2,
      a * c2 + c * d2,
      b * c2 + d * d2,
      a * e2 + c * f2 + e,
      b * e2 + d * f2 + f,
    ];
  };
  const ensure = (): SubPath => {
    if (current === null) {
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    }
    return current;
  };

  const ctx = {
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(v: number) {
      lineWidth = v;
    },
    canvas: null,
    fillStyle: '#000',
    strokeStyle: '#000',
    beginPath(): void {
      subPaths = [];
      current = null;
    },
    closePath(): void {
      if (current) current.closed = true;
    },
    moveTo(x: number, y: number): void {
      cursor = apply(x, y);
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    },
    lineTo(x: number, y: number): void {
      cursor = apply(x, y);
      ensure().points.push(cursor);
    },
    rect(x: number, y: number, w: number, h: number): void {
      subPaths.push({
        points: [apply(x, y), apply(x + w, y), apply(x + w, y + h), apply(x, y + h)],
        closed: true,
      });
      current = null;
    },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
      ensure().points.push(apply(cx, cy), apply(x, y));
      cursor = apply(x, y);
    },
    bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
      ensure().points.push(apply(c1x, c1y), apply(c2x, c2y), apply(x, y));
      cursor = apply(x, y);
    },
    arc(cx: number, cy: number, r: number, start: number, end: number): void {
      const sp = ensure();
      for (let i = 0; i <= 24; i++) {
        const ang = start + ((end - start) * i) / 24;
        sp.points.push(apply(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
      }
      sp.closed = true;
    },
    ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, start: number, end: number): void {
      const sp = ensure();
      for (let i = 0; i <= 24; i++) {
        const ang = start + ((end - start) * i) / 24;
        const ex = Math.cos(ang) * rx;
        const ey = Math.sin(ang) * ry;
        sp.points.push(apply(cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot)));
      }
      sp.closed = true;
    },
    save(): void {
      stack.push([...matrix]);
    },
    restore(): void {
      const m = stack.pop();
      if (m) matrix = m;
    },
    translate(x: number, y: number): void {
      multiply([1, 0, 0, 1, x, y]);
    },
    rotate(a: number): void {
      multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    },
    scale(x: number, y: number): void {
      multiply([x, 0, 0, y, 0, 0]);
    },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
      matrix = [a, b, c, d, e, f];
    },
    setLineDash(): void {},
    clearRect(): void {},
    clip(): void {},
    fill(): void {},
    stroke(): void {},
    fillRect(): void {},
    strokeRect(): void {},
    fillText(): void {},
    measureText(): { width: number } {
      return { width: 0 };
    },
    isPointInPath(px: number, py: number): boolean {
      let inside = false;
      for (const sp of subPaths) {
        const pts = sp.points;
        if (pts.length < 3) continue;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0];
          const yi = pts[i][1];
          const xj = pts[j][0];
          const yj = pts[j][1];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
      }
      return inside;
    },
    isPointInStroke(px: number, py: number): boolean {
      const half = lineWidth / 2;
      for (const sp of subPaths) {
        const pts = sp.points;
        const limit = sp.closed ? pts.length : pts.length - 1;
        for (let i = 0; i < limit; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len2 = dx * dx + dy * dy;
          const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
          if (Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)) <= half) return true;
        }
      }
      return false;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

/**
 * 受限容器 letterbox 几何（与 mountCanvas meet-fit 一致）：
 * Scene layout 100×100、CSS 显示盒 200×100（宽于内容比 → 水平 letterbox）。
 * scale = min(200/100, 100/100) = 1；offsetX = (200-100)/2 = 50，offsetY = 0。
 * ⇒ Scene 点 s → CSS px：cssX = 50 + s.x，cssY = s.y（canvas 局部）；client = canvas rect 左上 + cssX/cssY。
 */
const SCENE_SIZE = 100;
const CSS_WIDTH = 200;
const CSS_HEIGHT = 100;
const RECT_LEFT = 10;
const RECT_TOP = 20;

/** 把 Scene 点换成模拟的 client 坐标（rect 左上偏移 + letterbox offsetX） */
const sceneToClient = (sceneX: number, sceneY: number): { clientX: number; clientY: number } => ({
  clientX: RECT_LEFT + 50 + sceneX,
  clientY: RECT_TOP + 0 + sceneY,
});

let geometryCtx: CanvasRenderingContext2D;

beforeEach(() => {
  geometryCtx = createGeometryContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => geometryCtx);
  vi.spyOn(globalThis, 'devicePixelRatio', 'get').mockReturnValue(1);
  // CSS 显示盒固定 200×100，位于 (RECT_LEFT, RECT_TOP)
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        x: RECT_LEFT,
        y: RECT_TOP,
        left: RECT_LEFT,
        top: RECT_TOP,
        right: RECT_LEFT + CSS_WIDTH,
        bottom: RECT_TOP + CSS_HEIGHT,
        width: CSS_WIDTH,
        height: CSS_HEIGHT,
        toJSON: () => ({}),
      }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** 含一个填满整个 Scene 的矩形 Node（id="box"）的 IR */
const boxIr: IR = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'box',
      position: [SCENE_SIZE / 2, SCENE_SIZE / 2],
      shape: 'rectangle',
      minimumWidth: SCENE_SIZE,
      minimumHeight: SCENE_SIZE,
      fill: '#0a0',
    },
  ],
};

describe('@retikz/vanilla mountCanvas 水合（坐标映射 + hitTest）', () => {
  it('coord-mapping：受限容器 letterbox 下 client 坐标经逆 fit → 正确 Scene 点', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    // Scene 中心 (50,50) → client (RECT_LEFT+50+50, RECT_TOP+50)
    const { clientX, clientY } = sceneToClient(50, 50);
    const scene = view.clientToScene(clientX, clientY);
    expect(scene.x).toBeCloseTo(50, 5);
    expect(scene.y).toBeCloseTo(50, 5);
  });

  it('hydrate-hit：client 坐标 → 坐标映射 + hitTest 命中正确图元 id → handler 触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    const onClick = vi.fn();
    view.hydrate({ handlers: { box: { click: onClick } } });

    const { clientX, clientY } = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
    expect(onClick).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('hydrate-context：canvas handler 收 (event, context)——element=null、renderer=canvas，id/meta/geometry 仍对', () => {
    const metaBoxIr: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'box', position: [SCENE_SIZE / 2, SCENE_SIZE / 2], shape: 'rectangle', minimumWidth: SCENE_SIZE, minimumHeight: SCENE_SIZE, fill: '#0a0', meta: { series: 'sales', i: 3 } },
      ],
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, metaBoxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    let context: HydrationContext | undefined;
    view.hydrate({ handlers: { box: { click: (_event, received) => { context = received; } } } });

    const { clientX, clientY } = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
    expect(context?.id).toBe('box');
    expect(context?.renderer).toBe('canvas');
    expect(context?.element).toBeNull();
    expect(context?.meta).toEqual({ series: 'sales', i: 3 });
    expect(context?.geometry?.bbox.width).toBeGreaterThan(0);
    expect(context?.point?.x).toBeCloseTo(50, 5);
    // per-id 动画控制可调用、不抛（registry-backed，作用于命中元素）
    expect(typeof context?.animation.restart).toBe('function');
    expect(() => context?.animation.restart()).not.toThrow();
    expect(() => context?.animation.pause()).not.toThrow();
    expect(() => context?.animation.stop()).not.toThrow();

    container.remove();
  });

  it('hydrate-miss：client 坐标落 letterbox 黑边（Scene 外）→ 不触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    const onClick = vi.fn();
    view.hydrate({ handlers: { box: { click: onClick } } });

    // client x 落左侧 letterbox 黑边（Scene x < 0）
    view.root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: RECT_LEFT + 10, clientY: RECT_TOP + 50 }));
    expect(onClick).not.toHaveBeenCalled();

    container.remove();
  });

  it('enter-on-pointermove：pointermove 进入 canvas 图元 → pointerEnter 触发一次（双模等价、不依赖 relatedTarget）', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    const onEnter = vi.fn();
    view.hydrate({ handlers: { box: { pointerEnter: onEnter } } });

    // canvas 是单 <canvas>、图元间移动不产生 over/out；新机制经 pointermove + 命中 id 状态机合成。
    // 先在 letterbox 黑边（Scene 外、命中 null），再移到图元中心 → 跨 id（null→box）触发 enter 一次。
    view.root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: RECT_LEFT + 10, clientY: RECT_TOP + 50 }));
    expect(onEnter).not.toHaveBeenCalled();
    const center = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: center.clientX, clientY: center.clientY }));
    expect(onEnter).toHaveBeenCalledTimes(1);

    // 图元内部继续 move（命中仍是 box）→ 不重复触发
    view.root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: center.clientX + 1, clientY: center.clientY + 1 }));
    expect(onEnter).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('enter-leave-on-pointermove：跨图元（box → 黑边）→ box 的 leave 触发一次', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    const onLeave = vi.fn();
    view.hydrate({ handlers: { box: { pointerLeave: onLeave } } });

    const center = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: center.clientX, clientY: center.clientY }));
    // 移到 letterbox 黑边（命中 null）→ box 的 leave 一次
    view.root.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: RECT_LEFT + 10, clientY: RECT_TOP + 50 }));
    expect(onLeave).toHaveBeenCalledTimes(1);

    container.remove();
  });

  it('dispose-detaches：view.hydrate 的 dispose 后点击不再触发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, boxIr, { width: CSS_WIDTH, height: CSS_HEIGHT });
    const onClick = vi.fn();
    const handle = view.hydrate({ handlers: { box: { click: onClick } } });
    handle.dispose();

    const { clientX, clientY } = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
    expect(onClick).not.toHaveBeenCalled();

    container.remove();
  });

  it('on-event-animation：无用户 handler 时，{onEvent:click} track 命中后也会激活 canvas per-id 时钟', () => {
    const rafSpy = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'box',
          position: [SCENE_SIZE / 2, SCENE_SIZE / 2],
          shape: 'rectangle',
          minimumWidth: SCENE_SIZE,
          minimumHeight: SCENE_SIZE,
          fill: '#0a0',
          animations: [
            {
              property: 'opacity',
              keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }],
              duration: 300,
              trigger: { onEvent: 'click' },
            },
          ],
        },
      ],
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = mountCanvas(container, ir, { width: CSS_WIDTH, height: CSS_HEIGHT });
    view.hydrate({ handlers: {} });
    expect(rafSpy).not.toHaveBeenCalled();

    const { clientX, clientY } = sceneToClient(50, 50);
    view.root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));

    expect(rafSpy).toHaveBeenCalled();
    container.remove();
  });
});
