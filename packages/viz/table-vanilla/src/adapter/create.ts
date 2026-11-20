import { createTableRuntimeContribution, prepareTableData, TABLE_NAMESPACE } from '@retikz/table';
import type {
  InputEmbedContext,
  InputEmbedContribution,
  InputEmbedPreparation,
  InputEmbedPreparationContext,
} from '@retikz/vanilla';

import { RetikzTableVanillaError } from '../error';
import type { InputTable } from '../normalize/table';
import { normalizeTable } from '../normalize/table';

/** 可复用于多个 embed 与 update 周期的无状态 Table InputEmbed adapter */
export const tableInputEmbedAdapter = {
  kind: TABLE_NAMESPACE,
  lower: <TNative>(props: InputTable<TNative>, _context: InputEmbedContext): InputEmbedContribution => {
    if (props.dataBindings !== undefined || props.dataTransformExecutor !== undefined || props.signal !== undefined)
      throw new RetikzTableVanillaError('Table bindings, executor or signal require async processing');

    const spec = normalizeTable(props.table);
    const contribution = createTableRuntimeContribution({
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });

    return { node: spec, providerDependencies: contribution };
  },
  prepare: async <TNative>(
    props: InputTable<TNative>,
    context: InputEmbedPreparationContext,
  ): Promise<InputEmbedPreparation> => {
    if (props.data !== undefined && props.dataBindings !== undefined)
      throw new RetikzTableVanillaError('Table data and dataBindings are mutually exclusive');

    const spec = normalizeTable(props.table);
    const signal = props.signal === undefined ? context.signal : AbortSignal.any([props.signal, context.signal]);
    const preparation = await prepareTableData(
      spec,
      {
        dataBindings:
          props.dataBindings ??
          Object.fromEntries(
            Object.entries(props.data ?? {}).map(([reference, rows]) => [reference, { kind: 'rows' as const, rows }]),
          ),
        dataTransformExecutor: props.dataTransformExecutor,
        signal,
      },
      props.lowerOptions,
    );
    const providerDependencies = createTableRuntimeContribution({
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });

    return {
      execute: async () => ({
        node: spec,
        providerDependencies,
        runtimeInputs: [{ path: [], input: await preparation.execute() }],
      }),
    };
  },
};
