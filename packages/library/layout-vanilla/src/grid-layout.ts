import type { GridLayoutInput } from '@retikz/layout';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGridLayout } from '@retikz/layout';

import { LayoutVanillaNamespace } from './constants';
import { makeVanillaLayoutComposites } from './layout-family';

/** Vanilla Grid 布局嵌入项的稳定类别 */
const GridLayoutEmbedKind = 'layout.gridLayout';

/** Layout Grid 布局的 Vanilla 适配器 */
export const GridLayoutVanillaAdapter: VanillaTier2Adapter<GridLayoutInput> = {
  kind: GridLayoutEmbedKind,
  namespace: LayoutVanillaNamespace,
  lower: props => ({
    node: createGridLayout(props),
    datasets: {},
    makeComposites: makeVanillaLayoutComposites,
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
