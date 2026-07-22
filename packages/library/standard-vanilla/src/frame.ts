import type { FrameInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFrame, FrameDefinition } from '@retikz/standard';

/** Vanilla Frame 输入由 embed id 派生持久化 Scope id */
export type FrameVanillaInput = Omit<FrameInput, 'id'>;

/** Vanilla Frame embed 的稳定 kind */
const FrameEmbedKind = 'standard.frame';

/** 当前 Figure 内局部贡献 FrameDefinition 的稳定 maker */
const makeFrameComposites = () => [FrameDefinition];

/** Standard Frame 的 Vanilla Tier 2 adapter */
export const FrameVanillaAdapter: VanillaTier2Adapter<FrameVanillaInput> = {
  kind: FrameEmbedKind,
  namespace: 'standard.frame',
  lower: (props, context) => ({
    node: createFrame({ ...props, id: `${context.id}/frame` }),
    datasets: {},
    makeComposites: makeFrameComposites,
  }),
};

/** 创建由 FrameVanillaAdapter 下沉的 Standard Frame embed */
export const frame = (id: string, input: FrameVanillaInput): VanillaEmbedSpec<FrameVanillaInput> => ({
  type: 'embed',
  kind: FrameEmbedKind,
  id,
  props: input,
});
