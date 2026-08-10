import type { FlexLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFlexLayout } from '@retikz/layout';

import { LayoutVanillaNamespace } from './constants';
import { makeVanillaLayoutComposites } from './layout-family';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const FlexLayoutEmbedKind = 'layout.flexLayout';

/** Layout Flex 布局的 Vanilla 适配器 */
export const FlexLayoutVanillaAdapter: VanillaTier2Adapter<FlexLayoutInput> = {
  kind: FlexLayoutEmbedKind,
  namespace: LayoutVanillaNamespace,
  lower: props => ({
    node: createFlexLayout(props),
    datasets: {},
    makeComposites: makeVanillaLayoutComposites,
  }),
};

/** 创建由 Layout 适配器下沉的 Flex 布局嵌入项 */
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
