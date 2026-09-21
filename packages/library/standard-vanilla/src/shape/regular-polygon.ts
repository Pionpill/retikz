import type { IRRegularPolygon } from '@retikz/standard/shape';
import { RegularPolygonProvider, createRegularPolygon } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** RegularPolygon 的 Vanilla 作者输入 */
export type InputRegularPolygon = InputShape<IRRegularPolygon>;
/** 将 RegularPolygon 作者输入归一为持久化的 Standard 意图 */
export const RegularPolygonInputEmbedAdapter: InputEmbedAdapter<InputRegularPolygon & { id?: string }> = {
  kind: 'standard.regularPolygon',
  lower: props => ({
    node: createRegularPolygon(normalizeShapeInput<IRRegularPolygon>(props)),
    providerDependencies: { roots: [RegularPolygonProvider.key], providers: [RegularPolygonProvider] },
  }),
};
