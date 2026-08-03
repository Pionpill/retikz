import type { OverlayLayoutInput, OverlayLayoutInspectOptions } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createOverlayLayout, OverlayLayoutInspectOptionsInputSchema } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

/** Vanilla OverlayLayout embed 的稳定 kind */
const OverlayLayoutEmbedKind = 'standard.overlayLayout';

/** Standard OverlayLayout 的 Vanilla Tier 2 adapter */
export const OverlayLayoutVanillaAdapter: VanillaTier2Adapter<OverlayLayoutInput> = {
  kind: OverlayLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createOverlayLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 OverlayLayoutVanillaAdapter 下沉的 Standard OverlayLayout embed */
export const overlayLayout = (
  id: string,
  input: OverlayLayoutInput,
  inspect?: boolean | OverlayLayoutInspectOptions,
): VanillaEmbedSpec<OverlayLayoutInput, OverlayLayoutInspectOptions> => ({
  type: 'embed',
  kind: OverlayLayoutEmbedKind,
  id,
  props: input,
  ...(inspect === undefined
    ? {}
    : { inspect: typeof inspect === 'object' ? OverlayLayoutInspectOptionsInputSchema.parse(inspect) : inspect }),
});
