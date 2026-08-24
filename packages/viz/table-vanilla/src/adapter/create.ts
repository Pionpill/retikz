import type { InputEmbedAdapter } from '@retikz/vanilla';

import { createTableRuntimeContribution, TABLE_NAMESPACE } from '@retikz/table';

import type { InputTable } from '../normalize/table';

import { normalizeTable } from '../normalize/table';

/** 可复用于多个 embed 与 update 周期的无状态 Table InputEmbed adapter */
export const TableInputEmbedAdapter: InputEmbedAdapter<InputTable> = {
  kind: TABLE_NAMESPACE,
  lower: (props, context) => {
    const spec = normalizeTable(props.table);
    const contribution = createTableRuntimeContribution({
      reference: context.id,
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });
    return { node: spec, providerDependencies: contribution };
  },
};
