import type { LayoutCompositeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { z } from 'zod';

import { defineComposite } from '@retikz/core';

import type { IRTableSpec } from '../schemas';
import type { LowerTablesOptions } from './types';

import { TableLayoutManifestSchema } from '../contract';
import { TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '../schemas';
import { resolveTableTransaction } from './layout';

/** 构造 Table 的 layout-aware composite definition，供 Core compile options 注入 */
export const lowerTables = (
  datasets: ExternalDatasets,
  options: LowerTablesOptions = {},
): Array<
  LayoutCompositeDefinition<
    IRTableSpec,
    typeof TABLE_NAMESPACE,
    typeof TableComposite.Table,
    z.output<typeof TableLayoutManifestSchema>
  >
> => [
  defineComposite({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    schema: TableSpecSchema,
    artifactSchema: TableLayoutManifestSchema,
    compile: (spec: IRTableSpec, context) => {
      const transaction = resolveTableTransaction(spec, datasets, options, context);
      return {
        children: transaction.children,
        artifact: TableLayoutManifestSchema.parse(transaction.manifest),
      };
    },
  }),
];
