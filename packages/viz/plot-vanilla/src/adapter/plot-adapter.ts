import type { CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';
import type { DataLineageOptions, ExternalDatasets } from '@retikz/data';
import type { IRPlot, LowerPlotsOptions } from '@retikz/plot';
import {
  createPlotProvider as createPlotDependencyProvider,
  createPlotProviderContribution,
  PLOT_NAMESPACE,
  preparePlotData,
} from '@retikz/plot';
import type {
  InputEmbedContext,
  InputEmbedPreparationContext,
  SynchronousInputEmbedAdapter,
  InputScope,
} from '@retikz/vanilla';
import { normalizeScopeWithChildren } from '@retikz/vanilla';

import { RetikzPlotVanillaError } from '../error';
import type { InputPlotEmbed, PreparedPlotLineageNotification } from '../spec';
import { plotIROf } from '../spec';

/** 将 Plot 根节点包进可选的面板 Scope */
const wrapPlotPanel = (node: IRPlot, panel: InputPlotEmbed['panel']) => {
  if (panel === undefined) return node;

  const { x, y, transforms, zIndex, clip, theme } = panel;
  const panelTransforms =
    x !== undefined || y !== undefined
      ? [{ kind: 'translate' as const, x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])]
      : transforms;
  if (panelTransforms === undefined && zIndex === undefined && clip === undefined && theme === undefined) return node;

  const input: InputScope = {
    type: 'scope',
    ...(panelTransforms === undefined ? {} : { transforms: panelTransforms }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [node],
  };

  return normalizeScopeWithChildren(input, () => [node]);
};

/** 完整 IRPlot 的 Vanilla contribution request */
export type PlotContributionRequest = Readonly<{
  /** 已完成的 IRPlot */
  spec: IRPlot;
  /** runtime-only dataset table */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
}>;

/** Plot-owned Vanilla contribution 解析结果 */
export type ResolvedPlotContribution = Readonly<{
  /** 已类型化的完整 Plot Source IR */
  spec: IRPlot;
  /** Plot composite 及其 Standard shape 依赖的 provider contribution */
  contribution: CoreProviderContribution;
}>;

/** 创建一个共享 datasets 与 lowering options 的 Plot dependency provider */
export const createPlotProvider = (input: {
  datasets: ExternalDatasets;
  lowerOptions?: LowerPlotsOptions;
}): CoreDependencyProvider => createPlotDependencyProvider(input.datasets, input.lowerOptions);

/** 将完整 IRPlot 归一为 Plot-owned dependency contribution */
export const resolvePlotContribution = (request: PlotContributionRequest): ResolvedPlotContribution => {
  return {
    spec: request.spec,
    contribution: createPlotProviderContribution(request.datasets, request.lowerOptions),
  };
};

/** 将 Plot authoring input 下沉为 Core contribution 的 InputEmbed adapter */
export const PlotInputEmbedAdapter = {
  kind: PLOT_NAMESPACE,
  lower: (props: InputPlotEmbed, _context: InputEmbedContext) => {
    if (props.datasets === undefined || props.dataTransformExecutor !== undefined || props.signal !== undefined)
      throw new RetikzPlotVanillaError('Plot dataBindings, executor or signal require async processing');

    const spec = plotIROf(props);
    const providerDependencies = createPlotProviderContribution(props.datasets, props.lowerOptions);

    return {
      node: wrapPlotPanel(spec, props.panel),
      providerDependencies,
    };
  },
  prepare: async <TSource>(
    props: InputPlotEmbed<TSource>,
    context: InputEmbedPreparationContext,
    lineage?: DataLineageOptions,
  ) => {
    const spec = plotIROf(props);
    const node = wrapPlotPanel(spec, props.panel);
    const signal = props.signal === undefined ? context.signal : AbortSignal.any([props.signal, context.signal]);
    const dataBindings =
      props.dataBindings ??
      Object.fromEntries(
        Object.entries(props.datasets).map(([reference, rows]) => [reference, { kind: 'rows' as const, rows }]),
      );
    const preparation = await preparePlotData(
      spec,
      {
        dataBindings,
        dataTransformExecutor: props.dataTransformExecutor,
        signal,
        lineage:
          lineage ??
          (props.onLineage !== undefined && props.lineage !== false ? (props.lineage?.data ?? {}) : undefined),
      },
      props.lowerOptions,
    );
    const providerDependencies = createPlotProviderContribution({}, props.lowerOptions);

    return {
      execute: async () => {
        const preparedData = await preparation.execute();
        const authoring: PreparedPlotLineageNotification | undefined =
          props.onLineage === undefined || props.lineage === false
            ? undefined
            : {
                spec,
                preparedData,
                lowerOptions: props.lowerOptions,
                lineage: props.lineage ?? {},
                hostLineageMetadata: props.hostLineageMetadata,
                onLineage: props.onLineage,
              };

        return {
          node,
          providerDependencies,
          runtimeInputs: [{ path: node === spec ? [] : ['children', 0], input: preparedData }],
          ...(authoring === undefined
            ? {}
            : { authoringSites: [{ kind: 'embeddable' as const, type: 'plot.prepared-lineage', authoring }] }),
        };
      },
    };
  },
} satisfies SynchronousInputEmbedAdapter<InputPlotEmbed>;
