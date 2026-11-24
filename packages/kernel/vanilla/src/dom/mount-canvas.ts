import type { IRScene } from '@retikz/core';
import type { HitPoint } from '@retikz/render/canvas';

import type { SceneInputBindings } from '../runtime';
import { DEFAULT_ID_PREFIX } from '../runtime';
import type { MountCanvasOptions, CanvasView } from './types';
import { createView } from './view';

/** 设备像素比：取有限正数、否则回退 1（镜像 react CanvasHost） */
const getDevicePixelRatio = (override: number | undefined): number => {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override;
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

/** 将 IR 挂载到 Canvas 视图 */
export const mountCanvasView = (
  container: Element,
  ir: IRScene,
  options: MountCanvasOptions = {},
  bindings?: SceneInputBindings,
): CanvasView => {
  const canvas = document.createElement('canvas');
  const output = options.output ?? {};
  const ratio = getDevicePixelRatio(options.canvas?.devicePixelRatio);
  if (output.width !== undefined) canvas.style.width = `${output.width}px`;
  if (output.height !== undefined) canvas.style.height = `${output.height}px`;
  canvas.style.objectFit = 'contain';
  const processing = createView({
    backend: 'canvas',
    host: canvas,
    ir,
    bindings,
    mountOptions: options,
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    devicePixelRatio: ratio,
  });
  container.appendChild(canvas);

  const clientToScene = (clientX: number, clientY: number): HitPoint => {
    const { layout } = processing.result().scene;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
    const offsetX = (rect.width - layout.width * scale) / 2;
    const offsetY = (rect.height - layout.height * scale) / 2;

    return {
      x: (clientX - rect.left - offsetX) / scale + layout.x,
      y: (clientY - rect.top - offsetY) / scale + layout.y,
    };
  };

  return {
    root: canvas,
    update: processing.update,
    updateInput: processing.updateInput,
    hydrate: hydrateOptions => processing.hydrate(hydrateOptions),
    diagnostics: () => processing.diagnostics(),
    clientToScene,
    dispose: () => {
      processing.dispose();
      canvas.remove();
    },
    get animation() {
      return processing.read().animation;
    },
    get compileResult() {
      return processing.result();
    },
  };
};
