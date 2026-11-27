import { createTableRuntimeContribution, TABLE_NAMESPACE } from '@retikz/table';
import type { InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import type { InputTable } from '../normalize/table';
import { normalizeTable } from '../normalize/table';

/** 将已就绪的 Table 数据绑定到根实例 */
export const tableInputEmbedAdapter = {
  kind: TABLE_NAMESPACE,
  lower: (props: InputTable, _context: InputEmbedContext) => ({
    node: normalizeTable(props.table),
    providerDependencies: createTableRuntimeContribution({
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    }),
    ...(props.preparedData === undefined ? {} : { runtimeInputs: [{ path: [], input: props.preparedData }] }),
  }),
} satisfies InputEmbedAdapter<InputTable>;
