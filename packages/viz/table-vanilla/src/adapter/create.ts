import type { InputEmbedAdapter } from '@retikz/vanilla';

import { createTableRuntimeContribution, TABLE_NAMESPACE, TableComposite } from '@retikz/table';

import type { InputTable } from '../normalize/table';

import { normalizeTable } from '../normalize/table';
import { assertTableVanillaNonEmptyString } from '../shared';

/** 可复用于多个 embed 与 update 周期的无状态 Table InputEmbed adapter */
export const TableInputEmbedAdapter: InputEmbedAdapter<InputTable> = {
  kind: TABLE_NAMESPACE,
  lower: (props, context) => {
    assertTableVanillaNonEmptyString(context.id, 'table vanilla: embed id must be non-empty');
    const spec = normalizeTable(props.table);
    const node =
      props.preserveRootIdentity === true
        ? spec
        : {
            ...spec,
            id: `${context.id}/${spec.id ?? TableComposite.Table}`,
          };
    const contribution = createTableRuntimeContribution({
      reference: context.id,
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });
    return { node, compositeDependencies: contribution };
  },
};
