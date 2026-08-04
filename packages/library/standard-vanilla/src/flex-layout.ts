import type { FlexLayoutInput, FlexLayoutInspectOptions } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFlexLayout, FlexLayoutInspectOptionsInputSchema } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

/** Vanilla FlexLayout embed 的稳定 kind */
const FlexLayoutEmbedKind = 'standard.flexLayout';

/** Standard FlexLayout 的 Vanilla Tier 2 adapter */
export const FlexLayoutVanillaAdapter: VanillaTier2Adapter<FlexLayoutInput> = {
  kind: FlexLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createFlexLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 FlexLayoutVanillaAdapter 下沉的 Standard FlexLayout embed */
export const flexLayout = (
  id: string,
  input: FlexLayoutInput,
  inspect?: boolean | FlexLayoutInspectOptions,
): VanillaEmbedSpec<FlexLayoutInput, FlexLayoutInspectOptions> => ({
  type: 'embed',
  kind: FlexLayoutEmbedKind,
  id,
  props: input,
  ...(inspect === undefined
    ? {}
    : { inspect: typeof inspect === 'object' ? FlexLayoutInspectOptionsInputSchema.parse(inspect) : inspect }),
});
