import type { AnyCellPresentationDefinition } from '../../contract';
import type { IRTableCellAppearance, IRTablePresentationRef } from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** presentation 阶段消费的最终 Cell carrier */
export type ResolvedTableCellPresentationInput =
  | Readonly<{
      /** value Cell 判别字段 */
      kind: 'value';
      /** 对应 formatted / semantic Cell id */
      cellId: string;
      /** 实际执行的 presentation provider 引用 */
      presentation: IRTablePresentationRef;
      /** 已完成上游级联的最终视觉输入 */
      appearance: DeepReadonly<IRTableCellAppearance>;
    }>
  | Readonly<{
      /** direct content Cell 判别字段 */
      kind: 'content';
      /** 对应 formatted / semantic Cell id */
      cellId: string;
      /** 已完成上游级联的最终视觉输入 */
      appearance: DeepReadonly<IRTableCellAppearance>;
    }>;

/** presentation 阶段的 identity-aligned carrier 与 provider options */
export type PresentTableOptions = Readonly<{
  /** 与 formatted Cells 等长同序的最终 carrier */
  cells?: ReadonlyArray<ResolvedTableCellPresentationInput>;
  /** 当前 Table 可用的自定义 presentation definitions */
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>;
}>;
