import type { Scene } from '@retikz/core';
import { renderToCanvas } from '@retikz/render/canvas';
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
    renderToCanvas(canvas, scene, { devicePixelRatio: ratio });
  };

  const initialScene = isFigure(input) ? input.ir : input;
  renderInto(initialScene);
  container.appendChild(canvas);

  /**
   * 把指针的 client 像素坐标逆 meet-fit 映射成 Scene user units
   * @description meet-fit 正向：scenePx = scale·(sceneUnit − layout.origin) + offset（letterbox 居中）；
   *   此处求逆——读 `canvas.getBoundingClientRect()` 把 client 坐标降到 canvas 局部 CSS 像素，再除 scale + 还原
   *   layout origin / letterbox offset。stub 暂返回原始 client 坐标占位，留 Impl 接逆 fit。
   */
  const clientToScene = (clientX: number, clientY: number): ScenePoint => {
    void currentScene;
    // stub：Impl Agent 接逆 meet-fit（getBoundingClientRect + scale + letterbox offset + layout origin）
    return { x: clientX, y: clientY };
  };

  let disposed = false;

  const hydrate = (hydrateOptions: HydrateOptions) => {
    void hydrateOptions;
    void clientToScene;
    // stub：Impl Agent 接 createHydrationController(canvas, handlers, locate)，
    //   locate = event → hitTest(currentScene, clientToScene(event.clientX, event.clientY), { context2d })
    return { dispose() {} };
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
      canvas.remove();
    },
    hydrate,
    clientToScene,
  };
};
