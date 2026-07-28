import type { IRPlotSpec, PlotAuthoringInput } from '@retikz/plot';
import type { VanillaEmbedSpec } from '@retikz/vanilla';

import { createPlotSpec, PLOT_NAMESPACE } from '@retikz/plot';
import { embed } from '@retikz/vanilla';

import type { PlotEmbedProps } from './types';

/** 从 plain authoring input 创建 schema-valid PlotSpec */
export const plot = (input: PlotAuthoringInput): IRPlotSpec => createPlotSpec(input);

/** 构造可由 Plot Vanilla adapter 消费的标准 embed spec */
export const embedPlot = (id: string, spec: IRPlotSpec): VanillaEmbedSpec<PlotEmbedProps> => {
  if (id.trim().length === 0) throw new Error('plot vanilla: embed id must be non-empty');
  return embed(PLOT_NAMESPACE, id, { spec });
};
