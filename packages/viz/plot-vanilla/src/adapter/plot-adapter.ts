import type { IRScope } from '@retikz/core';
import type { IRPlot } from '@retikz/plot';
import { createPlotProviderContribution, PLOT_NAMESPACE } from '@retikz/plot';
import type { InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import type { InputPlotEmbed, PreparedPlotLineageNotification } from '../spec';
import { plotIROf } from '../spec';

/** 将 Plot 根节点包进可选的面板 Scope */
const wrapPlotPanel = (node: IRPlot, panel: InputPlotEmbed['panel']): IRPlot | IRScope => {
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

  return {
    type: 'scope',
    ...(position === undefined ? {} : { position }),
    ...(transforms === undefined ? {} : { transforms }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [node],
  };
};

/** 将 Plot authoring input 下沉为 Core contribution 的 InputEmbed adapter */
export const plotInputEmbedAdapter = {
  kind: PLOT_NAMESPACE,
  lower: (props: InputPlotEmbed, _context: InputEmbedContext) => {
    const spec = plotIROf(props);
    const node = wrapPlotPanel(spec, props.panel);
    const { preparedData, datasets, onLineage, lineage, hostLineageMetadata, lowerOptions } = props;
    const authoring: PreparedPlotLineageNotification | undefined =
      onLineage === undefined || lineage === false
        ? undefined
        : { spec, datasets, preparedData, onLineage, lineage: lineage ?? {}, hostLineageMetadata, lowerOptions };
    return {
      node,
      providerDependencies: createPlotProviderContribution(datasets ?? {}, lowerOptions),
      ...(preparedData === undefined
        ? {}
        : { runtimeInputs: [{ path: node === spec ? [] : ['children', 0], input: preparedData }] }),
      ...(authoring === undefined
        ? {}
        : { authoringSites: [{ kind: 'embeddable', type: 'plot.prepared-lineage', authoring }] }),
    };
  },
} satisfies InputEmbedAdapter<InputPlotEmbed>;
