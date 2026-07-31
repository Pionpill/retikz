import type {
  AnyCellVisualScaleDefinition,
  CellVisualScaleResolveContext,
  TableCellAppearanceTracePathValue,
  TableCellPlanSource,
  TableLegendDescriptor,
} from '../../contract';
import type { ResolvedTableStyleTokens } from '../../providers/style';
import type {
  IRTableCellAppearance,
  IRTableCellRule,
  IRTableCellVisualEncoding,
  IRTableFormatterRef,
  IRTablePresentationRef,
  TableVisualChannelValue,
} from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** Cell appearance winner 的逐叶来源 */
export type TableCellAppearanceTrace = DeepReadonly<
  Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>>
>;

/** Rule 解析后交给 formatter、presentation 与后续 manifest 的 Cell plan */
export type ResolvedTableCellPlan =
  | Readonly<{
      /** value Cell 判别字段 */
      kind: 'value';
      /** canonical 单元格 id */
      cellId: string;
      /** 最终 formatter 引用 */
      formatter: DeepReadonly<IRTableFormatterRef>;
      /** 最终 presentation 引用 */
      presentation: DeepReadonly<IRTablePresentationRef>;
      /** 进入 presentation 与布局的最终 appearance */
      appearance: DeepReadonly<IRTableCellAppearance>;
      /** value Cell 的规则与 appearance 胜者追溯 */
      trace: Readonly<{
        /** formatter 胜者来源 */
        formatter: TableCellPlanSource;
        /** presentation 胜者来源 */
        presentation: TableCellPlanSource;
        /** appearance 逐叶胜者来源 */
        appearance: TableCellAppearanceTrace;
        /** 按声明顺序保留的命中规则 index */
        matchedRuleIndices: ReadonlyArray<number>;
        /** 实际为该 Cell 产生颜色的 encoding ids */
        encodingIds?: ReadonlyArray<string>;
      }>;
    }>
  | Readonly<{
      /** content Cell 判别字段 */
      kind: 'content';
      /** canonical 单元格 id */
      cellId: string;
      /** 进入布局的最终 appearance */
      appearance: DeepReadonly<IRTableCellAppearance>;
      /** content Cell 的规则与 appearance 胜者追溯 */
      trace: Readonly<{
        /** appearance 逐叶胜者来源 */
        appearance: TableCellAppearanceTrace;
        /** 按声明顺序保留的命中规则 index */
        matchedRuleIndices: ReadonlyArray<number>;
      }>;
    }>;

/** package-private Cell plan resolver 选项 */
export type ResolveTableCellPlansOptions = Readonly<{
  /** 按声明顺序应用的根规则 */
  rules?: ReadonlyArray<IRTableCellRule>;
  /** 按声明顺序应用的视觉编码 */
  encodings?: ReadonlyArray<IRTableCellVisualEncoding>;
  /** 自定义视觉 scale definitions */
  visualScaleDefinitions?: ReadonlyArray<AnyCellVisualScaleDefinition>;
  /** 同次 style resolution 产生的 required palette */
  scaleContext: CellVisualScaleResolveContext;
  /** 同次 style resolution 产生的完整 Cell/token seeds */
  styleTokens?: ResolvedTableStyleTokens;
}>;

/** manifest 消费的单个 encoding 解析摘要 */
export type ResolvedTableEncoding = Readonly<{
  /** Encoding 稳定 id */
  id: string;
  /** Encoding 拥有的 appearance channel */
  channel: TableVisualChannelValue;
  /** 已解析的 scale definition 名称 */
  scaleName: string;
  /** 实际产生颜色的 canonical Cell ids */
  cellIds: ReadonlyArray<string>;
}>;

/** 同次 plan orchestration 的 Cell、descriptor 与 encoding bundle */
export type ResolvedTablePlan = Readonly<{
  /** canonical 单元格计划 */
  cells: ReadonlyArray<ResolvedTableCellPlan>;
  /** 与实绘同源的 Legend descriptors */
  legendDescriptors: ReadonlyArray<TableLegendDescriptor>;
  /** manifest 使用的 encoding seed */
  encodings: ReadonlyArray<ResolvedTableEncoding>;
}>;
