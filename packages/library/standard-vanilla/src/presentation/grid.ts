import type { GridInput } from '@retikz/standard/presentation';
import { createGrid, GridProvider } from '@retikz/standard/presentation';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { StandardGridEmbedKind } from '../shared/constants';

/** Standard Grid 的 InputEmbed adapter */
export const GridInputEmbedAdapter: InputEmbedAdapter<GridInput> = {
  kind: StandardGridEmbedKind,
  lower: props => ({
    node: createGrid(props),
    providerDependencies: { roots: [GridProvider.key], providers: [GridProvider] },
  }),
};

/** 创建由 GridInputEmbedAdapter 下沉的 Standard Grid embed */
export const grid = (input: GridInput): InputEmbed<GridInput> => ({
  type: 'embed',
  kind: StandardGridEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
