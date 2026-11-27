import type { InputGrid } from '@retikz/standard/presentation';
import { createGrid, gridProvider } from '@retikz/standard/presentation';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { standardGridEmbedKind } from '../shared/constants';

/** Standard Grid 的 InputEmbed adapter */
export const gridInputEmbedAdapter: InputEmbedAdapter<InputGrid> = {
  kind: standardGridEmbedKind,
  lower: props => ({
    node: createGrid(props),
    providerDependencies: { roots: [gridProvider.key], providers: [gridProvider] },
  }),
};

/** 创建由 gridInputEmbedAdapter 下沉的 Standard Grid embed */
export const grid = (input: InputGrid): InputEmbed<InputGrid> =>
  embed({
    adapter: gridInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
