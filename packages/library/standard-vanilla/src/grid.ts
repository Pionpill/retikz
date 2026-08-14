import type { GridInput } from '@retikz/standard';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createGrid, GridProvider } from '@retikz/standard';

import { StandardGridEmbedKind } from './constants';

/** Standard Grid 的 InputEmbed adapter */
export const GridInputEmbedAdapter: InputEmbedAdapter<GridInput> = {
  kind: StandardGridEmbedKind,
  lower: props => ({
    node: createGrid(props),
    compositeDependencies: { roots: [GridProvider.key], providers: [GridProvider] },
  }),
};

/** 创建由 GridInputEmbedAdapter 下沉的 Standard Grid embed */
export const grid = (id: string, input: GridInput): InputEmbed<GridInput> => ({
  type: 'embed',
  kind: StandardGridEmbedKind,
  id,
  props: input,
});
