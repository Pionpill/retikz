import type { IREllipse } from '@retikz/standard/shape';
import { EllipseProvider, createEllipse } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Ellipse 的 Vanilla 作者输入 */
export type InputEllipse = InputShape<IREllipse>;
/** 将 Ellipse 作者输入归一为持久化的 Standard 意图 */
export const EllipseInputEmbedAdapter: InputEmbedAdapter<InputEllipse & { id?: string }> = {
  kind: 'standard.ellipse',
  lower: props => ({
    node: createEllipse(normalizeShapeInput<IREllipse>(props)),
    providerDependencies: { roots: [EllipseProvider.key], providers: [EllipseProvider] },
  }),
};
