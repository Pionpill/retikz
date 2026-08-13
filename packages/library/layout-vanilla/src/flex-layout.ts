import type { FlexLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createFlexLayout, FlexLayoutProvider } from '@retikz/layout';

/** Vanilla Flex 布局嵌入项的稳定类别 */
const FlexLayoutEmbedKind = 'layout.flexLayout';

/** Layout Flex 布局的 Vanilla 适配器 */
export const FlexLayoutVanillaAdapter: VanillaTier2Adapter<FlexLayoutInput> = {
  kind: FlexLayoutEmbedKind,
  lower: props => ({
    node: createFlexLayout(props),
    providerDependencies: { roots: [FlexLayoutProvider.key], providers: [FlexLayoutProvider] },
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
