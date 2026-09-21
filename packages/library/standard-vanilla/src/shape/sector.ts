import type { IRSector } from '@retikz/standard/shape';
import { SectorProvider, createSector } from '@retikz/standard/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import type { InputShape } from './shared';
import { normalizeShapeInput } from './shared';
/** Sector 的 Vanilla 作者输入 */
export type InputSector = InputShape<IRSector>;
/** 将 Sector 作者输入归一为持久化的 Standard 意图 */
export const SectorInputEmbedAdapter: InputEmbedAdapter<InputSector & { id?: string }> = {
  kind: 'standard.sector',
  lower: props => ({
    node: createSector(normalizeShapeInput<IRSector>(props)),
    providerDependencies: { roots: [SectorProvider.key], providers: [SectorProvider] },
  }),
};
