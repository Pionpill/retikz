import type { TableCellAppearanceTracePathValue, TableCellPlanSource } from '../../contract';
import type { IRTableCellAppearance, IRTableFormatterRef, IRTablePresentationRef } from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** Cell appearance winner 的逐叶来源 */
export type TableCellAppearanceTrace = DeepReadonly<
  Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>>
>;

/** Rule 解析后交给 formatter、presentation 与后续 manifest 的 Cell plan */
export type ResolvedTableCellPlan =
  | Readonly<{
      kind: 'value';
      cellId: string;
      formatter: DeepReadonly<IRTableFormatterRef>;
      presentation: DeepReadonly<IRTablePresentationRef>;
      appearance: DeepReadonly<IRTableCellAppearance>;
      trace: Readonly<{
        formatter: TableCellPlanSource;
        presentation: TableCellPlanSource;
        appearance: TableCellAppearanceTrace;
        matchedRuleIndices: ReadonlyArray<number>;
      }>;
    }>
  | Readonly<{
      kind: 'content';
      cellId: string;
      appearance: DeepReadonly<IRTableCellAppearance>;
      trace: Readonly<{
        appearance: TableCellAppearanceTrace;
        matchedRuleIndices: ReadonlyArray<number>;
      }>;
    }>;
