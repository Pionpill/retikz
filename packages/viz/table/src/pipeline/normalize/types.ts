import type { ExternalDatasets, IRDataReference, DataTransformResult } from '@retikz/data';

import type { AnyTableStructureDefinition } from '../../contract';

/** 表格结构归一化选项 */
export type NormalizeTableStructureOptions = Readonly<{
  /** 根 Table 外部数据引用 */
  data?: IRDataReference;
  /** 宿主注入的外部 datasets */
  datasets?: ExternalDatasets;
  /** 本次准备的规范结果，不再次解析源数据 */
  preparedData?: DataTransformResult;
  /** 用户自定义 structure definitions */
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
}>;
