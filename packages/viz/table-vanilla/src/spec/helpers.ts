import type { DetailTableInput, IRDetailTable, IRManualTable, IRTable, ManualTableInput } from '@retikz/table';
import type { InputEmbed } from '@retikz/vanilla';

import { assertNonEmptyString } from '@retikz/foundation';
import { createDetailTableIR, createManualTableIR, TABLE_NAMESPACE } from '@retikz/table';
import { embed } from '@retikz/vanilla';

import type { InputTable, InputTableVariant } from '../normalize/table';

import { inputTableFromIR } from '../normalize/table';

/** 从 plain detail 输入构造 Table spec */
export const detailTable = (input: DetailTableInput): IRDetailTable => createDetailTableIR(input);

/** 从 plain manual 输入构造 Table spec */
export const manualTable = (input: ManualTableInput): IRManualTable => createManualTableIR(input);

/** 构造可由 Table Vanilla adapter 消费的标准 embed spec */
export const embedTable = (
  id: string,
  spec: IRTable,
  options: Omit<InputTable, 'table'> = {},
): InputEmbed<InputTable> => {
  assertNonEmptyString(id, 'table vanilla embed id');
  const table: InputTableVariant = inputTableFromIR(spec);
  return embed(TABLE_NAMESPACE, id, { table, ...options });
};
