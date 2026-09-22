import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot, LowerPlotsOptions } from '@retikz/plot';
import { PLOT_NAMESPACE } from '@retikz/plot';
import type { InputEmbed } from '@retikz/vanilla';
import { embed } from '@retikz/vanilla';

import type { InputPlot } from '../normalize/plot';
import { normalizePlot } from '../normalize/plot';
import type { InputPlotEmbed, PlotSource } from './types';

/** 从 plain authoring input 创建 Plot Source IR */
export const plot = (input: InputPlot): IRPlot => normalizePlot(input);

/** 将显式 Plot source 收敛为 Plot Source IR；IR source 保持原对象身份 */
export const plotIROf = (source: PlotSource): IRPlot =>
  source.input === undefined ? source.spec : normalizePlot(source.input);

/** 构造可由 Plot InputEmbedAdapter 消费的标准 embed */
export const embedPlot = (
  source: PlotSource,
  datasets: ExternalDatasets,
  lowerOptions?: LowerPlotsOptions,
): InputEmbed<InputPlotEmbed> => {
  const id = source.input === undefined ? source.spec.id : source.input.id;
  return embed({
    kind: PLOT_NAMESPACE,
    ...(id === undefined ? {} : { id }),
    props: {
      ...source,
      datasets,
      ...(lowerOptions === undefined ? {} : { lowerOptions }),
    },
  });
};
