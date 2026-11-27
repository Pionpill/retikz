import type {
  InputDetailTableConfig,
  IRDetailTable,
  IRManualTable,
  IRTable,
  InputManualTableConfig,
} from '@retikz/table';
import { createDetailTableIR, createManualTableIR } from '@retikz/table';
import type { InputEmbed } from '@retikz/vanilla';
import { embed } from '@retikz/vanilla';

import { tableInputEmbedAdapter } from '../adapter';
import type { InputTable, InputTableData, InputTableVariant } from '../normalize/table';
import { inputTableFromIR } from '../normalize/table';

/** 从 plain detail 输入构造 Table spec */
export const detailTable = (input: InputDetailTableConfig): IRDetailTable => createDetailTableIR(input);

/** 从 plain manual 输入构造 Table spec */
export const manualTable = (input: InputManualTableConfig): IRManualTable => createManualTableIR(input);

/**
 * 构造可由 Table Vanilla adapter 消费的标准 embed spec
 */
export const embedTable = (
  spec: IRTable,
  options: InputTableData & Pick<InputTable, 'composites' | 'lowerOptions'> = {},
): InputEmbed<InputTable> => {
  const table: InputTableVariant = inputTableFromIR(spec);
  return embed({
    adapter: tableInputEmbedAdapter,
    ...(spec.id === undefined ? {} : { id: spec.id }),
    props: { table, ...options },
  });
};
