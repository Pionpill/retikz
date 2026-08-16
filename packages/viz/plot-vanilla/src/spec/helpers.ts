import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot, LowerPlotsOptions } from '@retikz/plot';
import type { InputEmbed } from '@retikz/vanilla';

import { PLOT_NAMESPACE } from '@retikz/plot';
import { embed } from '@retikz/vanilla';

import type { InputPlot } from '../normalize/plot';
import type { InputPlotEmbed, PlotSource } from './types';

import { normalizePlot } from '../normalize/plot';
import { assertPlotVanillaNonEmptyString } from '../shared';

/** 从 plain authoring input 创建 Plot Source IR */
export const plot = (input: InputPlot): IRPlot => normalizePlot(input);

/** 将显式 Plot source 收敛为 Plot Source IR；IR source 保持原对象身份 */
export const plotIROf = (source: PlotSource): IRPlot =>
  source.input === undefined ? source.spec : normalizePlot(source.input);

/** 构造可由 Plot InputEmbedAdapter 消费的标准 embed */
export const embedPlot = (
  id: string,
  source: PlotSource,
  datasets: ExternalDatasets,
  lowerOptions?: LowerPlotsOptions,
): InputEmbed<InputPlotEmbed> => {
  assertPlotVanillaNonEmptyString(id, 'plot vanilla: embed id must be non-empty');
  return embed(PLOT_NAMESPACE, id, {
    ...source,
    datasets,
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
  });
};
