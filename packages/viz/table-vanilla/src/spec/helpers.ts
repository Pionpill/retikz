import type {
  DetailTableSpecInput,
  IRDetailTableSpec,
  IRManualTableSpec,
  IRTableSpec,
  ManualTableSpecInput,
} from '@retikz/table';
import type { VanillaEmbedSpec } from '@retikz/vanilla';

import { createDetailTableSpec, createManualTableSpec, TABLE_NAMESPACE } from '@retikz/table';
import { embed } from '@retikz/vanilla';

import type { TableEmbedProps } from './types';

import { assertTableVanillaNonEmptyString } from '../shared';

/** 从 plain detail 输入构造 Table spec */
export const detailTable = (input: DetailTableSpecInput): IRDetailTableSpec => createDetailTableSpec(input);

/** 从 plain manual 输入构造 Table spec */
export const manualTable = (input: ManualTableSpecInput): IRManualTableSpec => createManualTableSpec(input);

/** 构造可由 Table Vanilla adapter 消费的标准 embed spec */
export const embedTable = (
  id: string,
  spec: IRTableSpec,
  options: Omit<TableEmbedProps, 'spec'> = {},
): VanillaEmbedSpec<TableEmbedProps> => {
  assertTableVanillaNonEmptyString(id, 'table vanilla: embed id must be non-empty');
  return embed(TABLE_NAMESPACE, id, { spec, ...options });
};
