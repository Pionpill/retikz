import type { IRStar } from '@retikz/standard/shape';
import { StarProvider, createStar } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Star 的 Vanilla 作者输入 */
export type InputStar = InputShape<IRStar>;
/** 将 Star 作者输入归一为持久化的 Standard 意图 */
export const StarInputEmbedAdapter: InputEmbedAdapter<InputStar & { id?: string }> = {
  kind: 'standard.star',
  lower: props => ({
    node: createStar(normalizeShapeInput<IRStar>(props)),
    providerDependencies: { roots: [StarProvider.key], providers: [StarProvider] },
  }),
};
