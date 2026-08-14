import type { AnyCompositeDefinition, CoreProviderContribution } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import type { LowerTablesOptions } from '../types';

/** 单个 Table embed 向宿主贡献的 runtime 输入 */
export type TableRuntimeContributionInput = Readonly<{
  /** 显式稳定的 Table runtime reference */
  reference: string;
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composite definitions */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;

/** 可由 React 与 Vanilla 宿主统一聚合的 Table runtime contribution */
export type TableRuntimeContribution = CoreProviderContribution;
