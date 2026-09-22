import type { DetailTableInput, IRDetailTable, IRManualTable, IRTable, ManualTableInput } from '@retikz/table';
import { createDetailTableIR, createManualTableIR, TABLE_NAMESPACE } from '@retikz/table';
import type { InputEmbed } from '@retikz/vanilla';
import { embed } from '@retikz/vanilla';

import type { InputTable, InputTableVariant } from '../normalize/table';
import { inputTableFromIR } from '../normalize/table';

/** 从 plain detail 输入构造 Table spec */
export const detailTable = (input: DetailTableInput): IRDetailTable => createDetailTableIR(input);

/** 从 plain manual 输入构造 Table spec */
export const manualTable = (input: ManualTableInput): IRManualTable => createManualTableIR(input);

/** 构造可由 Table Vanilla adapter 消费的标准 embed spec */
export const embedTable = (spec: IRTable, options: Omit<InputTable, 'table'> = {}): InputEmbed<InputTable> => {
  const table: InputTableVariant = inputTableFromIR(spec);
  return embed({
    kind: TABLE_NAMESPACE,
    ...(spec.id === undefined ? {} : { id: spec.id }),
    props: { table, ...options },
  });
};
