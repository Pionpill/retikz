import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { output as ZodOutput } from 'zod';

import { TableLayoutManifestSchema } from '../contract';
import type { IRTable } from '../schemas';
import { TABLE_NAMESPACE, TableComposite, TableSchema } from '../schemas';
import { resolveTableTransaction } from './layout';
import type { LowerTablesOptions } from './types';

/** 构造 Table 的 layout-aware composite definition，供 Core compile options 注入 */
export const lowerTables = (
  datasets: ExternalDatasets,
  options: LowerTablesOptions = {},
): Array<
  LayoutCompositeDefinition<
    IRTable,
    typeof TABLE_NAMESPACE,
    typeof TableComposite.Table,
    ZodOutput<typeof TableLayoutManifestSchema>
  >
> => [
  defineComposite({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    schema: TableSchema,
    artifactSchema: TableLayoutManifestSchema,
    compile: (spec: IRTable, context) => {
      const transaction = resolveTableTransaction(spec, datasets, options, context);
      return {
        children: transaction.children,
        artifact: transaction.manifest,
      };
    },
  }),
];
