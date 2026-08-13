import type { OverlayLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createOverlayLayout, OverlayLayoutProvider } from '@retikz/layout';

/** Vanilla Overlay 布局嵌入项的稳定类别 */
const OverlayLayoutEmbedKind = 'layout.overlayLayout';

/** Layout Overlay 布局的 Vanilla 适配器 */
export const OverlayLayoutVanillaAdapter: VanillaTier2Adapter<OverlayLayoutInput> = {
  kind: OverlayLayoutEmbedKind,
  lower: props => ({
    node: createOverlayLayout(props),
    providerDependencies: { roots: [OverlayLayoutProvider.key], providers: [OverlayLayoutProvider] },
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
