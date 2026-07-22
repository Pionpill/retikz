import type { AxesInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { AxesDefinition, createAxes } from '@retikz/standard';

/** Vanilla Axes embed 的稳定 kind */
const AxesEmbedKind = 'standard.axes';

/** 当前 Figure 内局部贡献 AxesDefinition 的稳定 maker */
const makeAxesComposites = () => [AxesDefinition];

/** Standard Axes 的 Vanilla Tier 2 adapter */
export const AxesVanillaAdapter: VanillaTier2Adapter<AxesInput> = {
  kind: AxesEmbedKind,
  namespace: 'standard.axes',
  lower: props => ({
    node: createAxes(props),
    datasets: {},
    makeComposites: makeAxesComposites,
  }),
};

/** 创建由 AxesVanillaAdapter 下沉的 Standard Axes embed */
export const axes = (id: string, input: AxesInput): VanillaEmbedSpec<AxesInput> => ({
  type: 'embed',
  kind: AxesEmbedKind,
  id,
  props: input,
});
