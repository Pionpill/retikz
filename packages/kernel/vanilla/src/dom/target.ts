import type {
  InputRendererFactory,
  InputRenderRuntimeConfig,
  RendererFactory,
  RenderTarget,
} from '@retikz/render/runtime';
import { builtinRendererFactory, createRenderTarget } from '@retikz/render/runtime';

/** 将编译会话的提交接到已有 DOM 根节点，不创建元素或编译会话 */
export const createDomRenderTarget = (
  renderer: InputRendererFactory,
  configuration: () => InputRenderRuntimeConfig,
  rendererFactory: RendererFactory = builtinRendererFactory,
): RenderTarget => {
  if (renderer.backend === 'svg') return createRenderTarget({ ...renderer, configuration, rendererFactory });
  const requestedRatio = renderer.immutableOptions.devicePixelRatio;
  const ratio =
    requestedRatio !== undefined && Number.isFinite(requestedRatio) && requestedRatio > 0
      ? requestedRatio
      : globalThis.devicePixelRatio;
  return createRenderTarget({
    ...renderer,
    configuration,
    rendererFactory,
    immutableOptions: {
      ...renderer.immutableOptions,
      devicePixelRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
    },
  });
};
