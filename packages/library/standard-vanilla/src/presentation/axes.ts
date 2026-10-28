import type { InputAxes } from '@retikz/standard/presentation';
import { axesProvider, createAxes } from '@retikz/standard/presentation';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { standardAxesEmbedKind } from '../shared/constants';

/** Standard Axes 的 InputEmbed adapter */
export const axesInputEmbedAdapter: SynchronousInputEmbedAdapter<InputAxes> = {
  kind: standardAxesEmbedKind,
  lower: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [axesProvider.key], providers: [axesProvider] },
  }),
};

/** 创建由 axesInputEmbedAdapter 下沉的 Standard Axes embed */
export const axes = (input: InputAxes): InputEmbed<InputAxes> => ({
  type: 'embed',
  kind: standardAxesEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
