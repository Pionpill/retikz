import { prepareChartData } from '@retikz/chart';
import type { IRChartSource } from '@retikz/chart';
import type { InputEmbedPreparationContext } from '@retikz/vanilla';

import { RetikzChartVanillaError } from '../error';
import { buildChartProviderContribution } from './contribution';
import { wrapChartPanel } from './scope';
import type { InputChartRuntime } from './types';

/** 将已构造的 Chart 转为同步贡献 */
export const lowerChartInput = <TNative>(runtime: InputChartRuntime<IRChartSource, TNative>) => {
  if (runtime.dataBindings !== undefined || runtime.dataTransformExecutor !== undefined || runtime.signal !== undefined)
    throw new RetikzChartVanillaError('Chart dataBindings, executor or signal require async processing');

  return {
    node: wrapChartPanel(runtime.source, runtime.panel),
    providerDependencies: buildChartProviderContribution(runtime),
  };
};

/** 保留原生数据源与其执行器的类型配对，准备异步贡献 */
export const prepareChartInput = async <TNative>(
  runtime: InputChartRuntime<IRChartSource, TNative>,
  context: InputEmbedPreparationContext,
) => {
  const node = wrapChartPanel(runtime.source, runtime.panel);
  const signal = runtime.signal === undefined ? context.signal : AbortSignal.any([runtime.signal, context.signal]);
  const preparation = await prepareChartData(
    runtime.source,
    {
      dataBindings:
        runtime.dataBindings ??
        Object.fromEntries(
          Object.entries(runtime.datasets).map(([reference, rows]) => [reference, { kind: 'rows' as const, rows }]),
        ),
      dataTransformExecutor: runtime.dataTransformExecutor,
      signal,
    },
    runtime.chartProviderContribution,
    runtime.lowerOptions,
  );
  const providerDependencies = buildChartProviderContribution({ ...runtime, datasets: {} });

  return {
    execute: async () => ({
      node,
      providerDependencies,
      runtimeInputs: [{ path: node === runtime.source ? [] : ['children', 0], input: await preparation.execute() }],
    }),
  };
};
