import type { IRPolygon } from '@retikz/standard/shape';
import { PolygonProvider, createPolygon } from '@retikz/standard/shape';
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Polygon 的 Vanilla 作者输入 */
export type InputPolygon = InputShape<IRPolygon>;
/** 将 Polygon 作者输入归一为持久化的 Standard 意图 */
export const PolygonInputEmbedAdapter: SynchronousInputEmbedAdapter<InputPolygon & { id?: string }> = {
  kind: 'standard.polygon',
  lower: props => ({
    node: createPolygon(normalizeShapeInput<IRPolygon>(props)),
    providerDependencies: { roots: [PolygonProvider.key], providers: [PolygonProvider] },
  }),
};
