import type { GridInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGrid, GridProvider } from '@retikz/standard';

import { StandardGridVanillaNamespace } from './constants';

/** Standard Grid 的 Vanilla Tier 2 adapter */
export const GridVanillaAdapter: VanillaTier2Adapter<GridInput> = {
  kind: StandardGridVanillaNamespace,
  lower: props => ({
    node: createGrid(props),
    compositeDependencies: { roots: [GridProvider.key], providers: [GridProvider] },
  }),
};

/** 创建由 GridVanillaAdapter 下沉的 Standard Grid embed */
export const grid = (id: string, input: GridInput): VanillaEmbedSpec<GridInput> => ({
  type: 'embed',
  kind: StandardGridVanillaNamespace,
  id,
  props: input,
});
