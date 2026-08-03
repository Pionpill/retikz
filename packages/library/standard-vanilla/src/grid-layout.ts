import type { GridLayoutInput, GridLayoutInspectOptions } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGridLayout, GridLayoutInspectOptionsInputSchema } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

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
export const gridLayout = (
  id: string,
  input: GridLayoutInput,
  inspect?: boolean | GridLayoutInspectOptions,
): VanillaEmbedSpec<GridLayoutInput, GridLayoutInspectOptions> => ({
  type: 'embed',
  kind: GridLayoutEmbedKind,
  id,
  props: input,
  ...(inspect === undefined
    ? {}
    : { inspect: typeof inspect === 'object' ? GridLayoutInspectOptionsInputSchema.parse(inspect) : inspect }),
});
