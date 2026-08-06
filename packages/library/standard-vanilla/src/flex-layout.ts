import type { FlexLayoutInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFlexLayout } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const FlexLayoutEmbedKind = 'standard.flexLayout';

/** Standard Flex 布局的 Vanilla 适配器 */
export const FlexLayoutVanillaAdapter: VanillaTier2Adapter<FlexLayoutInput> = {
  kind: FlexLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createFlexLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 Standard 适配器下沉的 Flex 布局嵌入项 */
export const flexLayout = (
  id: string,
  input: FlexLayoutInput,
  authoring?: unknown,
): VanillaEmbedSpec<FlexLayoutInput> => ({
  type: 'embed',
  kind: FlexLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
