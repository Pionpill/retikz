import type { IRCircle } from '@retikz/standard/shape';
import { CircleProvider, createCircle } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Circle 的 Vanilla 作者输入 */
export type InputCircle = InputShape<IRCircle>;
/** 将 Circle 作者输入归一为持久化的 Standard 意图 */
export const CircleInputEmbedAdapter: InputEmbedAdapter<InputCircle & { id?: string }> = {
  kind: 'standard.circle',
  lower: props => ({
    node: createCircle(normalizeShapeInput<IRCircle>(props)),
    providerDependencies: { roots: [CircleProvider.key], providers: [CircleProvider] },
  }),
};
