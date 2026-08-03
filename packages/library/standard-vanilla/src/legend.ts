import type { LegendInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createLegend, LegendDefinition } from '@retikz/standard';

/** Vanilla Legend embed 的稳定 kind */
const LegendEmbedKind = 'standard.legend';

/** 当前 Figure 内局部贡献 LegendDefinition 的稳定 maker */
const makeLegendComposites = () => [LegendDefinition];

/** Standard Legend 的 Vanilla Tier 2 adapter */
export const LegendVanillaAdapter: VanillaTier2Adapter<LegendInput> = {
  kind: LegendEmbedKind,
  namespace: 'standard.legend',
  lower: props => ({
    node: createLegend(props),
    datasets: {},
    makeComposites: makeLegendComposites,
  }),
};

/** 创建由 LegendVanillaAdapter 下沉的 Standard Legend embed */
export const legend = (id: string, input: LegendInput): VanillaEmbedSpec<LegendInput> => ({
  type: 'embed',
  kind: LegendEmbedKind,
  id,
  props: input,
});
