import type { GridLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGridLayout, GridLayoutProvider } from '@retikz/layout';

/** Vanilla Grid 布局嵌入项的稳定类别 */
const GridLayoutEmbedKind = 'layout.gridLayout';

/** Layout Grid 布局的 Vanilla 适配器 */
export const GridLayoutVanillaAdapter: VanillaTier2Adapter<GridLayoutInput> = {
  kind: GridLayoutEmbedKind,
  lower: props => ({
    node: createGridLayout(props),
    providerDependencies: { roots: [GridLayoutProvider.key], providers: [GridLayoutProvider] },
  }),
};

/** 创建由 Layout 适配器下沉的 Grid 布局嵌入项 */
export const gridLayout = (
  id: string,
  input: GridLayoutInput,
  authoring?: unknown,
): VanillaEmbedSpec<GridLayoutInput> => ({
  type: 'embed',
  kind: GridLayoutEmbedKind,
  id,
  props: input,
  ...(authoring === undefined ? {} : { authoring }),
});
