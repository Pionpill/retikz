import type { OverlayLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createOverlayLayout } from '@retikz/layout';

import { LayoutVanillaNamespace } from './constants';
import { makeVanillaLayoutComposites } from './layout-family';

/** Vanilla Overlay 布局嵌入项的稳定类别 */
const OverlayLayoutEmbedKind = 'layout.overlayLayout';

/** Layout Overlay 布局的 Vanilla 适配器 */
export const OverlayLayoutVanillaAdapter: VanillaTier2Adapter<OverlayLayoutInput> = {
  kind: OverlayLayoutEmbedKind,
  namespace: LayoutVanillaNamespace,
  lower: props => ({
    node: createOverlayLayout(props),
    datasets: {},
    makeComposites: makeVanillaLayoutComposites,
  }),
};

/** 创建由 Layout 适配器下沉的 Overlay 布局嵌入项 */
export const overlayLayout = (
  id: string,
  input: OverlayLayoutInput,
  authoring?: unknown,
): VanillaEmbedSpec<OverlayLayoutInput> => ({
  type: 'embed',
  kind: OverlayLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
