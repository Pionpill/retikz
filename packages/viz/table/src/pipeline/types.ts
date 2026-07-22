import type { IRChild } from '@retikz/core';

import type { AnyCellPresentationDefinition, AnyTableStructureDefinition, TableLayoutManifest } from '../contract';

/** Table lowering 的运行时扩展选项 */
export type LowerTablesOptions = Readonly<{
  /** 用户自定义 structure definitions */
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
  /** 用户自定义 Cell presentation definitions */
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>;
}>;

/** Table lowering 的 Core IR 与显式 sidecar 产物 */
export type TableLoweringResult = Readonly<{
  /** renderer 可消费的 Core IR */
  node: IRChild;
  /** 与本次 Core IR 同源的最小布局 manifest */
  manifest: TableLayoutManifest;
}>;
