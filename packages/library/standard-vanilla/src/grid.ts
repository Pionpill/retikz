import type { GridInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGrid, GridDefinition } from '@retikz/standard';

/** Vanilla Grid embed 的稳定 kind */
const GridEmbedKind = 'standard.grid';

/** 当前 Figure 内局部贡献 GridDefinition 的稳定 maker */
const makeGridComposites = () => [GridDefinition];

/** Standard Grid 的 Vanilla Tier 2 adapter */
export const GridVanillaAdapter: VanillaTier2Adapter<GridInput> = {
  kind: GridEmbedKind,
  namespace: 'standard.grid',
  lower: props => ({
    node: createGrid(props),
    datasets: {},
    makeComposites: makeGridComposites,
  }),
};

/** 创建由 GridVanillaAdapter 下沉的 Standard Grid embed */
export const grid = (id: string, input: GridInput): VanillaEmbedSpec<GridInput> => ({
  type: 'embed',
  kind: GridEmbedKind,
  id,
  props: input,
});
