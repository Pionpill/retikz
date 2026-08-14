import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions } from '@retikz/plot';
import type { InputEmbed } from '@retikz/vanilla';

import { PLOT_NAMESPACE } from '@retikz/plot';
import { embed } from '@retikz/vanilla';

import type { InputPlot } from '../normalize/plot';
import type { InputPlotEmbed } from './types';

import { normalizePlot } from '../normalize/plot';
import { assertPlotVanillaNonEmptyString } from '../shared';

/** 从 plain authoring input 创建 Plot Source IR */
export const plot = (input: InputPlot): IRPlotSpec => normalizePlot(input);

/** 构造可由 Plot InputEmbedAdapter 消费的标准 embed */
export const embedPlot = (
  id: string,
  spec: InputPlot,
  datasets: ExternalDatasets,
  lowerOptions?: LowerPlotsOptions,
): InputEmbed<InputPlotEmbed> => {
  assertPlotVanillaNonEmptyString(id, 'plot vanilla: embed id must be non-empty');
  return embed(PLOT_NAMESPACE, id, { spec, datasets, ...(lowerOptions === undefined ? {} : { lowerOptions }) });
};
