import type { InputAxes } from '@retikz/standard/presentation';
import { axesProvider, createAxes } from '@retikz/standard/presentation';
import { embed } from '@retikz/vanilla';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { standardAxesEmbedKind } from '../shared/constants';

/** Standard Axes 的 InputEmbed adapter */
export const axesInputEmbedAdapter: InputEmbedAdapter<InputAxes> = {
  kind: standardAxesEmbedKind,
  lower: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [axesProvider.key], providers: [axesProvider] },
  }),
};

/** 创建由 axesInputEmbedAdapter 下沉的 Standard Axes embed */
export const axes = (input: InputAxes): InputEmbed<InputAxes> =>
  embed({
    adapter: axesInputEmbedAdapter,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  });
