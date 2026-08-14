import type { AxesInput } from '@retikz/standard';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { AxesProvider, createAxes } from '@retikz/standard';

import { StandardAxesEmbedKind } from './constants';

/** Standard Axes 的 InputEmbed adapter */
export const AxesInputEmbedAdapter: InputEmbedAdapter<AxesInput> = {
  kind: StandardAxesEmbedKind,
  lower: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [AxesProvider.key], providers: [AxesProvider] },
  }),
};

/** 创建由 AxesInputEmbedAdapter 下沉的 Standard Axes embed */
export const axes = (id: string, input: AxesInput): InputEmbed<AxesInput> => ({
  type: 'embed',
  kind: StandardAxesEmbedKind,
  id,
  props: input,
});
