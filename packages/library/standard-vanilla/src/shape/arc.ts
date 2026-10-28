import type { IRArc } from '@retikz/standard/shape';
import { arcProvider, createArc } from '@retikz/standard/shape';
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';

/** Arc 的 Vanilla 作者输入 */
export type InputArc = InputShape<IRArc>;

/** 将 Arc 作者输入归一为持久化的 Standard 意图 */
export const arcInputEmbedAdapter: SynchronousInputEmbedAdapter<InputArc & { id?: string }> = {
  kind: 'standard.arc',
  lower: props => ({
    node: createArc(normalizeShapeInput<IRArc>(props)),
    providerDependencies: { roots: [arcProvider.key], providers: [arcProvider] },
  }),
};
