import type { GridLayoutInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import { createGridLayout } from '@retikz/standard';

import { StandardLayoutVanillaNamespace } from './constants';
import { makeVanillaStandardLayoutComposites } from './layout-family';

/** Vanilla Grid 布局嵌入项的稳定类别 */
const GridLayoutEmbedKind = 'standard.gridLayout';

/** Standard Grid 布局的 Vanilla 适配器 */
export const GridLayoutVanillaAdapter: VanillaTier2Adapter<GridLayoutInput> = {
  kind: GridLayoutEmbedKind,
  namespace: StandardLayoutVanillaNamespace,
  lower: props => ({
    node: createGridLayout(props),
    datasets: {},
    makeComposites: makeVanillaStandardLayoutComposites,
  }),
};

/** 创建由 Standard 适配器下沉的 Grid 布局嵌入项 */
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
