import type { CompositeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRTableSpec, LowerTablesOptions } from '@retikz/table';

/** Vanilla Table embed 的 runtime props */
export type TableEmbedProps = Readonly<{
  /** 待嵌入的完整 Table spec */
  spec: IRTableSpec;
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composites */
  composites?: ReadonlyArray<CompositeDefinition>;
}>;
