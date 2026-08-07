import type { OverlayLayoutInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createOverlayLayout } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

/** Vanilla Overlay 布局嵌入项的稳定类别 */
const OverlayLayoutEmbedKind = 'standard.overlayLayout';

/** Standard Overlay 布局的 Vanilla 适配器 */
export const OverlayLayoutVanillaAdapter: VanillaTier2Adapter<OverlayLayoutInput> = {
  kind: OverlayLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createOverlayLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 Standard 适配器下沉的 Overlay 布局嵌入项 */
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
