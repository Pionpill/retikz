import { defineComposite } from '@retikz/core';

import { lowerSector } from './pipeline';
import { SectorSchema } from './schema';
import type { IRSector } from './types';
/** Sector 的 Core composite 注册项 */
export const SectorDefinition = defineComposite({
  namespace: 'standard',
  type: 'sector',
  schema: SectorSchema,
  expand: (source: IRSector) => ({ children: [lowerSector(source)] }),
});
