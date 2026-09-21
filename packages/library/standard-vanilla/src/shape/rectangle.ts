import type { IRRectangle } from '@retikz/standard/shape';
import { RectangleProvider, createRectangle } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Rectangle 的 Vanilla 作者输入 */
export type InputRectangle = InputShape<IRRectangle>;
/** 将 Rectangle 作者输入归一为持久化的 Standard 意图 */
export const RectangleInputEmbedAdapter: InputEmbedAdapter<InputRectangle & { id?: string }> = {
  kind: 'standard.rectangle',
  lower: props => ({
    node: createRectangle(normalizeShapeInput<IRRectangle>(props)),
    providerDependencies: { roots: [RectangleProvider.key], providers: [RectangleProvider] },
  }),
};
