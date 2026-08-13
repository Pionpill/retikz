import type { VanillaTier2Adapter } from '@retikz/vanilla';

import { createTableRuntimeContribution, TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '@retikz/table';

import type { TableEmbedProps } from '../spec';

import { assertTableVanillaNonEmptyString } from '../shared';

/** 创建可复用于多个 embed 与 update 周期的无状态 Table adapter */
export const createTableAdapter = (): VanillaTier2Adapter<TableEmbedProps> => ({
  kind: TABLE_NAMESPACE,
  lower: (props, context) => {
    assertTableVanillaNonEmptyString(context.id, 'table vanilla: embed id must be non-empty');
    const parsed = TableSpecSchema.parse(props.spec);
    const node = TableSpecSchema.parse({
      ...parsed,
      id: `${context.id}/${parsed.id ?? TableComposite.Table}`,
    });
    const contribution = createTableRuntimeContribution({
      reference: context.id,
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });
    return { node, providerDependencies: contribution };
  },
});
