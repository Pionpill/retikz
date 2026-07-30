import type { FlexLayoutInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFlexLayout } from '@retikz/standard';

import { makeVanillaStandardLayoutComposites, StandardLayoutVanillaNamespace } from './layout-family';

/** Vanilla FlexLayout embed 的稳定 kind */
const FlexLayoutEmbedKind = 'standard.flexLayout';

/** Standard FlexLayout 的 Vanilla Tier 2 adapter */
export const FlexLayoutVanillaAdapter: VanillaTier2Adapter<FlexLayoutInput> = {
  kind: FlexLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createFlexLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 FlexLayoutVanillaAdapter 下沉的 Standard FlexLayout embed */
export const flexLayout = (id: string, input: FlexLayoutInput): VanillaEmbedSpec<FlexLayoutInput> => ({
  type: 'embed',
  kind: FlexLayoutEmbedKind,
  id,
  props: input,
});
