import { prepareChartData } from '@retikz/chart';
import type { IRChartSource } from '@retikz/chart';
import type { InputEmbedContext, InputEmbedPreparationContext, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { RetikzChartVanillaError } from '../error';
import { buildChartProviderContribution } from './contribution';
import { wrapChartPanel } from './scope';
import type { ChartRuntimeInput } from './types';

/** 具体 chartType 共享的同步贡献与异步数据准备 */
export const createChartInputEmbedAdapter = <TInput>(
  kind: string,
  createRuntime: (input: TInput) => ChartRuntimeInput<IRChartSource, unknown>,
) =>
  ({
    kind,
    lower: (input: TInput, _context: InputEmbedContext) => {
      const runtime = createRuntime(input);
      if (
        runtime.dataBindings !== undefined ||
        runtime.dataTransformExecutor !== undefined ||
        runtime.signal !== undefined
      )
        throw new RetikzChartVanillaError('Chart dataBindings, executor or signal require async processing');
      return {
        node: wrapChartPanel(runtime.source, runtime.panel),
        providerDependencies: buildChartProviderContribution(runtime),
      };
    },
    prepare: async (input: TInput, context: InputEmbedPreparationContext) => {
      const runtime = createRuntime(input);
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
        context.theme,
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
    },
  }) satisfies SynchronousInputEmbedAdapter<TInput>;
