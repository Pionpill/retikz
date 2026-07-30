import type { GridLayoutInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGridLayout } from '@retikz/standard';

import { makeVanillaStandardLayoutComposites, StandardLayoutVanillaNamespace } from './layout-family';

/** Vanilla GridLayout embed 的稳定 kind */
const GridLayoutEmbedKind = 'standard.gridLayout';

/** Standard GridLayout 的 Vanilla Tier 2 adapter */
export const GridLayoutVanillaAdapter: VanillaTier2Adapter<GridLayoutInput> = {
  kind: GridLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createGridLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 GridLayoutVanillaAdapter 下沉的 Standard GridLayout embed */
export const gridLayout = (id: string, input: GridLayoutInput): VanillaEmbedSpec<GridLayoutInput> => ({
  type: 'embed',
  kind: GridLayoutEmbedKind,
  id,
  props: input,
});
