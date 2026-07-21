import type { DetailTableSpecInput, IRTableSpec, ManualTableSpecInput } from '@retikz/table';
import type { VanillaEmbedSpec } from '@retikz/vanilla';

import { createDetailTableSpec, createManualTableSpec } from '@retikz/table';
import { embed } from '@retikz/vanilla';

import type { TableEmbedProps } from './types';

/** 从 plain detail 输入构造 Table spec */
export const detailTable = (input: DetailTableSpecInput): IRTableSpec => createDetailTableSpec(input);

/** 从 plain manual 输入构造 Table spec */
export const manualTable = (input: ManualTableSpecInput): IRTableSpec => createManualTableSpec(input);

/** 构造可由 Table Vanilla adapter 消费的标准 embed spec */
export const embedTable = (
  id: string,
  spec: IRTableSpec,
  options: Omit<TableEmbedProps, 'spec'> = {},
): VanillaEmbedSpec<TableEmbedProps> => {
  if (id.trim().length === 0) throw new Error('table vanilla: embed id must be non-empty');
  return embed('table', id, { spec, ...options });
};
