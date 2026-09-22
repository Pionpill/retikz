import type { AxesInput } from '@retikz/standard/presentation';
import { AxesProvider, createAxes } from '@retikz/standard/presentation';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { StandardAxesEmbedKind } from '../shared/constants';

/** Standard Axes 的 InputEmbed adapter */
export const AxesInputEmbedAdapter: InputEmbedAdapter<AxesInput> = {
  kind: StandardAxesEmbedKind,
  lower: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [AxesProvider.key], providers: [AxesProvider] },
  }),
};

/** 创建由 AxesInputEmbedAdapter 下沉的 Standard Axes embed */
export const axes = (input: AxesInput): InputEmbed<AxesInput> => ({
  type: 'embed',
  kind: StandardAxesEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
