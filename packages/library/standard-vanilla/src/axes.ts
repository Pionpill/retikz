import type { AxesInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { AxesProvider, createAxes } from '@retikz/standard';

import { StandardAxesVanillaNamespace } from './constants';

/** Standard Axes 的 Vanilla Tier 2 adapter */
export const AxesVanillaAdapter: VanillaTier2Adapter<AxesInput> = {
  kind: StandardAxesVanillaNamespace,
  lower: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [AxesProvider.key], providers: [AxesProvider] },
  }),
};

/** 创建由 AxesVanillaAdapter 下沉的 Standard Axes embed */
export const axes = (id: string, input: AxesInput): VanillaEmbedSpec<AxesInput> => ({
  type: 'embed',
  kind: StandardAxesVanillaNamespace,
  id,
  props: input,
});
