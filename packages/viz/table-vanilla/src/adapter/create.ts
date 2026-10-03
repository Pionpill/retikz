import { createTableRuntimeContribution, prepareTableData, TABLE_NAMESPACE } from '@retikz/table';
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { RetikzTableVanillaError } from '../error';
import type { InputTable } from '../normalize/table';
import { normalizeTable } from '../normalize/table';

/** 可复用于多个 embed 与 update 周期的无状态 Table InputEmbed adapter */
export const TableInputEmbedAdapter: SynchronousInputEmbedAdapter<InputTable<unknown>> &
  Required<Pick<SynchronousInputEmbedAdapter<InputTable<unknown>>, 'prepare'>> = {
  kind: TABLE_NAMESPACE,
  lower: (props, context) => {
    if (props.dataBindings !== undefined || props.dataTransformExecutor !== undefined || props.signal !== undefined)
      throw new RetikzTableVanillaError('Table bindings, executor or signal require async processing');
    const spec = normalizeTable(props.table);
    const contribution = createTableRuntimeContribution({
      reference: context.id,
      data: props.data,
      lowerOptions: props.lowerOptions,
      composites: props.composites,
    });
    return { node: spec, providerDependencies: contribution };
  },
  prepare: async (props, context) => {
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
      reference: context.id,
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
