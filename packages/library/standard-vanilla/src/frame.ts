import type {
  FrameDescriptionInput,
  FrameInput,
  FrameTitleInput,
  IRFrameDescription,
  IRFrameTitle,
} from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFrame, FrameDefinition, FrameDescriptionSchema, FrameTitleSchema } from '@retikz/standard';

import { StandardFrameVanillaNamespace } from './constants';

/** Vanilla Frame 输入由 embed id 派生持久化 Scope id */
export type FrameVanillaInput = Omit<FrameInput, 'id'>;

/** 当前 Figure 内局部贡献 FrameDefinition 的稳定 maker */
const makeFrameComposites = () => [FrameDefinition];

/** 创建 JSON-safe 的 Frame 主标题输入 */
export const frameTitle = (input: FrameTitleInput): IRFrameTitle => FrameTitleSchema.parse(input);

/** 创建 JSON-safe 的 Frame 辅助说明输入 */
export const frameDescription = (input: FrameDescriptionInput): IRFrameDescription =>
  FrameDescriptionSchema.parse(input);

/** Standard Frame 的 Vanilla Tier 2 adapter */
export const FrameVanillaAdapter: VanillaTier2Adapter<FrameVanillaInput> = {
  kind: StandardFrameVanillaNamespace,
  namespace: StandardFrameVanillaNamespace,
  lower: (props, context) => ({
    node: createFrame({ ...props, id: `${context.id}/frame` }),
    datasets: {},
    makeComposites: makeFrameComposites,
  }),
};

/** 创建由 FrameVanillaAdapter 下沉的 Standard Frame embed */
export const frame = (id: string, input: FrameVanillaInput): VanillaEmbedSpec<FrameVanillaInput> => ({
  type: 'embed',
  kind: StandardFrameVanillaNamespace,
  id,
  props: input,
});
