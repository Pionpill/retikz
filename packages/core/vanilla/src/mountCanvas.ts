import type { Scene } from '@retikz/core';
import { hitTest, renderToCanvas } from '@retikz/render/canvas';
import {
  type BuildContext,
  createClockAnimationControls,
  createHydrationController,
  geometryOf,
  metaOf,
} from '@retikz/render/hydration';
import { type AnimationControls, createClock, prefersReducedMotion, sceneAnimationDurationMs, sceneHasAnimations, sceneHasAutoplayTrigger } from '@retikz/render/animation';
import { isFigure } from './builder/isFigure';
import { toScene } from './toScene';
import type { CanvasView, HydrateOptions, MountCanvasOptions, RenderInput, ScenePoint } from './types';

/** 设备像素比：取有限正数、否则回退 1（镜像 react CanvasHost） */
const resolveDevicePixelRatio = (override: number | undefined): number => {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override;
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

/**
 * 把 IR / Scene / Figure 挂成真实 `<canvas>` DOM（无框架浏览器 runtime，对齐 `mountSvg`）
 * @description 收 IR 时 `toScene` compile、收 Scene 直用、收 Figure 解 `figure.ir`。位图按「名义显示尺寸」
 *   `width`/`height`（均为有限数值时）× dpr 开、否则回退内容边界；`renderToCanvas` 再把 Scene 内容 meet-fit
 *   进去（镜像 SVG `preserveAspectRatio=meet` + CanvasHost）。返回的 `CanvasView` 暴露 `hydrate`（hitTest 定位）
 *   与 `clientToScene`（逆 meet-fit 坐标映射）。DOM 仅在调用时惰性触碰，`import` 本模块不碰 DOM——守 SSR 导入安全。
 */
export const mountCanvas = (
  container: Element,
  input: RenderInput,
  options: MountCanvasOptions = {},
): CanvasView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountCanvas: container must be a DOM Element.');
  }

  const canvas = document.createElement('canvas');
  const ratio = resolveDevicePixelRatio(options.devicePixelRatio);
  // 动画总关：{animate:false} 或 prefers-reduced-motion → 不起 rAF、只画 base 静态
  const animate = options.animate !== false && !prefersReducedMotion();
  let clock: AnimationControls | undefined;

  let currentScene: Scene;

  const renderInto = (next: RenderInput): void => {
    if (isFigure(next)) {
      throw new Error('mountCanvas: view.update does not accept a Figure; pass figure.ir instead.');
    }
    const scene = toScene(next, options);
    currentScene = scene;
    const hasNominalSize =
      typeof options.width === 'number' &&
      Number.isFinite(options.width) &&
      typeof options.height === 'number' &&
      Number.isFinite(options.height);
    const bitmapWidth = hasNominalSize ? (options.width as number) : scene.layout.width;
    const bitmapHeight = hasNominalSize ? (options.height as number) : scene.layout.height;
    canvas.width = Math.max(1, Math.round(bitmapWidth * ratio));
    canvas.height = Math.max(1, Math.round(bitmapHeight * ratio));
    if (options.width !== undefined) canvas.style.width = `${options.width}px`;
    if (options.height !== undefined) canvas.style.height = `${options.height}px`;
    canvas.style.objectFit = 'contain';
    // base 静态先画一帧；含动画且未降级时起 rAF 时钟逐帧重绘（共享时钟，per-track delay 在 evaluateTrack 内偏移）
    renderToCanvas(canvas, scene, { devicePixelRatio: ratio });
    clock?.dispose();
    clock = undefined;
    if (animate && sceneHasAnimations(scene)) {
      clock = createClock({
        durationMs: sceneAnimationDurationMs(scene),
        onFrame: time =>
          renderToCanvas(canvas, currentScene, {
            devicePixelRatio: ratio,
            time,
            easings: options.easings,
            animationProperties: options.animationProperties,
          }),
      });
      if (sceneHasAutoplayTrigger(scene)) clock.play();
    }
  };

  const initialScene = isFigure(input) ? input.ir : input;
  renderInto(initialScene);
  container.appendChild(canvas);

  /**
   * 把指针的 client 像素坐标逆 meet-fit 映射成 Scene user units
   * @description meet-fit 正向（CSS 显示盒内，镜像 renderToCanvas / CanvasHost，dpr 在 client→CSS 这步已无关）：
   *   `scale = min(cssWidth/layout.width, cssHeight/layout.height)`；`offset = (cssSize − layout.size·scale)/2`
   *   居中 letterbox；`cssX = offset.x + (sceneX − layout.x)·scale`。此处求逆——读 `canvas.getBoundingClientRect()`
   *   把 client 坐标降到 canvas 局部 CSS 像素，再去 letterbox offset、除 scale、加 layout origin。落在 letterbox
   *   黑边外的点会得到 layout 区域外坐标，交由 `hitTest` 自然判为无命中（不在此截断）。
   */
  const clientToScene = (clientX: number, clientY: number): ScenePoint => {
    const { layout } = currentScene;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
    const offsetX = (rect.width - layout.width * scale) / 2;
    const offsetY = (rect.height - layout.height * scale) / 2;
    const contentX = clientX - rect.left - offsetX;
    const contentY = clientY - rect.top - offsetY;
    return { x: contentX / scale + layout.x, y: contentY / scale + layout.y };
  };

  let disposed = false;

  /**
   * canvas 水合：把 handler 经 hitTest 定位绑到 `<canvas>`
   * @description canvas 无逐图元 DOM，`locate(event)` = client 坐标经 `clientToScene` 逆 meet-fit 成 Scene 点
   *   （落 letterbox 黑边 → null、不命中），再 `hitTest(currentScene, point, { context2d })` 返回命中图元 id。
   *   `context2d` 用 canvas 自己的 2D context（生产真实；测试 spy 的 harness context 经 `getContext('2d')` 返回）
   *   作几何重建 + 原生点测的载体。绑定经 `createHydrationController`（根级委托 + enter/leave 合成 + dispose）。
   */
  const hydrate = (hydrateOptions: HydrateOptions): { dispose: () => void } => {
    const context2d = canvas.getContext('2d') ?? undefined;
    const locate = (event: Event): string | null => {
      const scenePoint = clientToScene((event as MouseEvent).clientX, (event as MouseEvent).clientY);
      // hitTest 把点测点表达在 Scene user units / 各图元局部帧、自管 group transform 栈；live canvas context
      // 经 renderToCanvas 后残留 meet-fit transform，须先归一到 identity 再点测，否则路径被二次缩放偏移。
      context2d?.setTransform(1, 0, 0, 1, 0, 0);
      return hitTest(currentScene, scenePoint, { context2d });
    };
    // canvas 富 context：无逐元素 DOM（element=null），point 经 clientToScene 逆 meet-fit，动画 coarse（scene 级单时钟）。
    // 读 live currentScene / clock，update 后自动反映新图。
    const buildContext: BuildContext = (event, id) => {
      const mouse = event as MouseEvent;
      return {
        id,
        meta: metaOf(currentScene, id),
        renderer: 'canvas',
        element: null,
        root: canvas,
        point: typeof mouse.clientX === 'number' ? clientToScene(mouse.clientX, mouse.clientY) : null,
        geometry: geometryOf(currentScene, id),
        animation: createClockAnimationControls(clock),
        scene: currentScene,
      };
    };
    const controller = createHydrationController(canvas, hydrateOptions.handlers, locate, buildContext);
    return { dispose: controller.dispose };
  };

  return {
    root: canvas,
    update(next) {
      if (disposed) throw new Error('mountCanvas: view already disposed.');
      renderInto(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clock?.dispose();
      canvas.remove();
    },
    hydrate,
    clientToScene,
    get animation() {
      return clock;
    },
  };
};
