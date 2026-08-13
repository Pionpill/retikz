import type { LegendInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createLegend, LegendProvider } from '@retikz/standard';

import { StandardLegendVanillaNamespace } from './constants';

/** Standard Legend 的 Vanilla Tier 2 adapter */
export const LegendVanillaAdapter: VanillaTier2Adapter<LegendInput> = {
  kind: StandardLegendVanillaNamespace,
  lower: props => ({
    node: createLegend(props),
    compositeDependencies: { roots: [LegendProvider.key], providers: [LegendProvider] },
  }),
};

/** 创建由 LegendVanillaAdapter 下沉的 Standard Legend embed */
export const legend = (id: string, input: LegendInput): VanillaEmbedSpec<LegendInput> => ({
  type: 'embed',
  kind: StandardLegendVanillaNamespace,
  id,
  props: input,
});
