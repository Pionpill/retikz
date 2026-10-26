import type { DataLineageOptions } from '@retikz/data';
import type { IRPlot } from '@retikz/plot';
import { createPlotProviderContribution, PLOT_NAMESPACE, preparePlotData } from '@retikz/plot';
import type {
  InputEmbedContext,
  InputEmbedPreparationContext,
  InputScope,
  SynchronousInputEmbedAdapter,
} from '@retikz/vanilla';
import { normalizeScopeWithChildren } from '@retikz/vanilla';

import { RetikzPlotVanillaError } from '../error';
import type { InputPlotEmbed, PreparedPlotLineageNotification } from '../spec';
import { plotIROf } from '../spec';

/** 将 Plot 根节点包进可选的面板 Scope */
const wrapPlotPanel = (node: IRPlot, panel: InputPlotEmbed['panel']) => {
  if (panel === undefined) return node;

  const { position, transforms, zIndex, clip, theme } = panel;
  if (
    position === undefined &&
    transforms === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  )
    return node;

  const input: InputScope = {
    type: 'scope',
    ...(position === undefined ? {} : { position }),
    ...(transforms === undefined ? {} : { transforms }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [node],
  };

  return normalizeScopeWithChildren(input, () => [node]);
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
