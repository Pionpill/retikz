import type { ExternalDatasets, IRDataReference } from '@retikz/data';

import type { AnyTableStructureDefinition } from '../../contract';

/** Table structure normalization options */
export type NormalizeTableStructureOptions = Readonly<{
  /** 根 Table 外部数据引用 */
  data?: IRDataReference;
  /** 宿主注入的外部 datasets */
  datasets?: ExternalDatasets;
  /** 用户自定义 structure definitions */
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
}>;
